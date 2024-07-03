const {
    DynamoDBClient,
    PutItemCommand,
} = require('@aws-sdk/client-dynamodb');
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

  const payload = JSON.parse(event.body);
  const keyId = payload.keyId;
  const balance = payload.balance;
  return await addCredit(creditsTable, keyId, balance);
};

async function addCredit(tableName, keyId, balance) {
  const newId = makeid(8);
  await dynamo.send(
      new PutItemCommand({
          TableName: tableName,
          Item: {
              id: { S: newId },
              keyId: { S: keyId },
              balance: { N: balance.toString() },
          },
      })
  );

  console.log('Dynamo data: ', JSON.stringify({ keyId, balance }, null, 2));
  return goodResponse(
      JSON.stringify({ keyId, balance })
  );
}