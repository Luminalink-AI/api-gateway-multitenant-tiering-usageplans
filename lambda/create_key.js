const {
	DynamoDBClient,
	GetItemCommand,
	PutItemCommand,
} = require('@aws-sdk/client-dynamodb');
const {
	APIGatewayClient,
	CreateApiKeyCommand,
	CreateUsagePlanKeyCommand,
} = require('@aws-sdk/client-api-gateway');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { findPoolForPlanId } = require('./api_key_pools');
const {
	parseJwt,
	goodResponse,
	internalServerErrorResponse,
	makeid,
} = require('./utils');

const dynamo = new DynamoDBClient({ region: 'eu-north-1' });
var apigateway = new APIGatewayClient({ region: 'eu-north-1' });

exports.handler = async function (event, context) {
	console.log('Received event:', JSON.stringify(event, null, 2));
	console.log('Received context: ', JSON.stringify(context, null, 2));

	const plansTable = process.env.PLANS_TABLE_NAME;
	const keysTable = process.env.KEYS_TABLE_NAME;
	const creditsTable = process.env.CREDITS_TABLE_NAME;

	const httpMethod = event.httpMethod; // e.g. "GET"
	const path = event.path; // e.g. "/admin/plans/123456
	const resource = event.resource; // e.g. "/admin/plans/{id}
	if (!event.headers || !event.headers.Authorization) {
			console.error('HTTP 500: Authorization header missing');
			return internalServerErrorResponse();
	}

	const token = event.headers.Authorization.split(' ')[1];

	if (
			!plansTable ||
			!keysTable ||
			!path ||
			!resource ||
			!httpMethod ||
			!token
	) {
			console.error(
					`HTTP 500: Precondition Fail: '${httpMethod}' '${path}' '${resource}' '${plansTable}' '${keysTable}' token.len=${token.len} `
			);
			return internalServerErrorResponse();
	}
	const jwt = parseJwt(token);
	console.log('JWT payload: ', JSON.stringify(jwt, null, 2));

	const key = JSON.parse(event.body);
	const rand = event.requestContext.requestId;
	const createdKey = await createKey(keysTable, key, plansTable, jwt, rand);

	if (createdKey.statusCode === 200) {
			// If the key was created successfully, create a row in the credits table
			await createCreditRow(creditsTable, JSON.parse(createdKey.body).id);
	}

	return createdKey;
};

async function createCreditRow(tableName, keyId) {
	const id = makeid(8);
	
	const item = {
					id: { S: id }, 
					keyId: { S: keyId },
					balance: { N: '0' },
	};

	await dynamo.send(
					new PutItemCommand({
									TableName: tableName,
									Item: item,
					})
	);

	console.log('Created a row in the credits table for keyId: ', keyId);
}

/**
* POST /admin/keys
*/
async function createKey(tableName, key, plansTable, jwt, rand) {
try {
	const pool = findPoolForPlanId(key.planId);

	if (!pool) {
		return await createSiloedKey(tableName, key, plansTable, jwt, rand);
	} else {
		return await createPooledKey(pool, tableName, key, jwt);
	}
} catch (err) {
	console.error("Error in createKey: ", err);
	return internalServerErrorResponse();
}
}

/**
* POST /admin/keys
*/
async function createSiloedKey(tableName, key, plansTable, jwt, rand) {
	console.log('createSiloedKey');

	var apiKeyId = undefined;

	// first make sure we have a valid plan ID
	const data = await dynamo.send(
			new GetItemCommand({
					TableName: plansTable,
					Key: {
							id: {
									S: key.planId,
							},
					},
			})
	);

	console.log('Found matching plan: ', data);

	// create an API key
	const apiKey = await apigateway.send(
			new CreateApiKeyCommand({
					name: key.name,
					description: key.description,
					enabled: key.enabled,
					tags: { ownerId: jwt.sub },
					value: rand,
			})
	);

	console.log('APIGateway created APIKey: ', apiKey);
	apiKeyId = apiKey.id;

	await apigateway.send(
			new CreateUsagePlanKeyCommand({
					keyId: apiKey.id,
					keyType: 'API_KEY',
					usagePlanId: key.planId,
			})
	);

	console.log('APIGateway registered key with usage plan ');

	// now save do our database.
	const item = {
			id: { S: apiKeyId },
			planId: { S: key.planId },
			name: { S: key.name },
			description: { S: key.description },
			enabled: { BOOL: key.enabled },
			owner: { S: jwt.sub },
			value: { S: rand },
	};

	await dynamo.send(
			new PutItemCommand({
					TableName: tableName,
					Item: item,
			})
	);

	console.log('Dynamo data: ', JSON.stringify(item, null, 2));
	console.log(goodResponse(JSON.stringify(unmarshall(item))));

	return goodResponse(JSON.stringify(unmarshall(item)));
}

async function createPooledKey(pool, tableName, key, jwt) {
	// first, choose a key from the pool.
	// a more sophisticated implementation would balance the load,
	// but for demo purposes, random suffices.
	var randomKeyFromPool =
			pool.apiKeys[Math.floor(Math.random() * pool.apiKeys.length)]; // note a production system can do much better than random.
	// first make sure we have a valid key ID

	console.log('createPooledKey', randomKeyFromPool);

	const data = await dynamo.send(
			new GetItemCommand({
					TableName: tableName,
					Key: {
							id: {
									S: randomKeyFromPool,
							},
					},
			})
	);

	console.log('FoundPooledKey: ', JSON.stringify(data, 0, 2));

	const newId = makeid(8);
	const item = {
			id: { S: newId },
			planId: { S: key.planId },
			name: { S: key.name },
			description: { S: key.description },
			enabled: { BOOL: key.enabled },
			owner: { S: jwt.sub },
			value: data.Item.value,
	};

	await dynamo.send(
			new PutItemCommand({
					TableName: tableName,
					Item: item,
			})
	);

	console.log('Dynamo data: ', JSON.stringify(item, null, 2));
	console.log(goodResponse(JSON.stringify(unmarshall(item))));
	return goodResponse(JSON.stringify(unmarshall(item)));
}