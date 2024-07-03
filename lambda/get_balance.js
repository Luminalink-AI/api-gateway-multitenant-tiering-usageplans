const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');

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

	const keyId = event.queryStringParameters.keyId;
	return await getBalance(creditsTable, keyId);
};

async function getBalance(tableName, keyId) {
  const result = await dynamo.send(
      new QueryCommand({
          TableName: tableName,
          IndexName: 'keyId-index',
          KeyConditionExpression: 'keyId = :keyId',
          ExpressionAttributeValues: {
              ':keyId': { S: keyId },
          },
      })
  );

  console.log('Dynamo data: ', JSON.stringify(result.Items, null, 2));

  const balance = result.Items[0]?.balance?.N;

  return goodResponse(balance);
}
