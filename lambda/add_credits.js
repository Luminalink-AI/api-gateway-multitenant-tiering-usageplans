const { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const {
    parseJwt,
    goodResponse,
    internalServerErrorResponse,
    makeid,
} = require('./utils');

const dynamo = new DynamoDBClient({ region: 'eu-north-1' });

exports.handler = async function (event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Received context: ', JSON.stringify(context, null, 2));

    const creditsTable = process.env.CREDITS_TABLE_NAME;
    const keysTable = process.env.KEYS_TABLE_NAME;

    if (!event.headers || !event.headers.Authorization) {
        console.error('HTTP 500: Authorization header missing');
        return internalServerErrorResponse();
    }

    const token = event.headers.Authorization.split(' ')[1];

    if (!creditsTable || !keysTable || !token) {
        console.error(
            `HTTP 500: Precondition Fail: 'creditsTable=${creditsTable}' 'keysTable=${keysTable}' token.len=${token.len} `
        );
        return internalServerErrorResponse();
    }
    const jwt = parseJwt(token);
    console.log('JWT payload: ', JSON.stringify(jwt, null, 2));

    const payload = JSON.parse(event.body);
    const keyId = payload.keyId;
    const credits = payload.credits;
    try {
        return await addCredit(creditsTable, keyId, credits, keysTable);
    } catch (error) {
        console.error(error.message);
        return internalServerErrorResponse();
    }
};

async function addCredit(tableName, keyId, credits, keysTable) {
    // Fetch the keyId from the credits table
    const keyData = await dynamo.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'keyId-index',
            KeyConditionExpression: 'keyId = :keyId',
            ExpressionAttributeValues: {
                ':keyId': { S: keyId },
            },
        })
    );

    // If the keyId does not exist, log an error and return an error response
    if (!keyData.Items || keyData.Items.length === 0) {
        console.error('keyId does not exist in credits table');
        return internalServerErrorResponse();
    }

    const currentBalance = Number(keyData.Items[0].balance.N);
    const newBalance = currentBalance + Number(credits);

    await dynamo.send(
        new UpdateItemCommand({
            TableName: tableName,
            Key: { 'id': { S: keyData.Items[0].id.S } },
            UpdateExpression: 'SET balance = :newBalance',
            ExpressionAttributeValues: {
                ':newBalance': { N: newBalance.toString() },
            },
            ReturnValues: 'UPDATED_NEW',
        })
    );

    console.log('Dynamo data: ', JSON.stringify({ keyId, balance: newBalance }, null, 2));
    return goodResponse(JSON.stringify({ keyId, balance: newBalance }));
}