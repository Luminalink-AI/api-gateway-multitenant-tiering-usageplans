const { DynamoDBClient, QueryCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const {
    parseJwt,
    goodResponse,
    internalServerErrorResponse,
} = require('./utils');

const dynamo = new DynamoDBClient({ region: 'eu-north-1' }); 

exports.handler = async function (event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Received context: ', JSON.stringify(context, null, 2));

    const creditsTable = process.env.CREDITS_TABLE_NAME;

    if (!event.headers || !event.headers.Authorization) {
        console.error('HTTP 500: Authorization header missing');
        return internalServerErrorResponse();
    }

    const token = event.headers.Authorization.split(' ')[1];

    if (!creditsTable || !token) {
        console.error(
            `HTTP 500: Precondition Fail: 'creditsTable=${creditsTable}' token.len=${token.len} `
        );
        return internalServerErrorResponse();
    }
    const jwt = parseJwt(token);
    console.log('JWT payload: ', JSON.stringify(jwt, null, 2));

    const keyId = JSON.parse(event.body).keyId;
    const newBalance = JSON.parse(event.body).newBalance;
    return await updateBalance(creditsTable, keyId, newBalance);
};

async function updateBalance(tableName, keyId, newBalance) {
    const queryResult = await dynamo.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'keyId-index',
            KeyConditionExpression: 'keyId = :keyId',
            ExpressionAttributeValues: {
                ':keyId': { S: keyId },
            },
        })
    );

    const primaryKey = queryResult.Items[0]?.id?.S;

    if (!primaryKey) {
        console.error('No item found with the specified keyId');
        return internalServerErrorResponse();
    }

    const updateResult = await dynamo.send(
        new UpdateItemCommand({
            TableName: tableName,
            Key: { 'id': { S: primaryKey } },
            UpdateExpression: 'SET balance = :newBalance',
            ExpressionAttributeValues: {
                ':newBalance': { N: newBalance },
            },
            ReturnValues: 'UPDATED_NEW',
        })
    );

    console.log('Update result: ', JSON.stringify(updateResult, null, 2));

    return goodResponse('Balance updated');
}