const { DynamoDBClient, DeleteItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { APIGatewayClient, DeleteApiKeyCommand, DeleteUsagePlanKeyCommand } = require("@aws-sdk/client-api-gateway");

const { findPoolForPlanId } = require("./api_key_pools");
const { parseJwt, goodResponse, internalServerErrorResponse } = require("./utils");

const dynamo = new DynamoDBClient({ region: "eu-north-1" }); 
const apigateway = new APIGatewayClient({ region: "eu-north-1" }); 

exports.handler = async function (event) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const plansTable = process.env.PLANS_TABLE_NAME;
  const keysTable = process.env.KEYS_TABLE_NAME;

  const httpMethod = event.httpMethod; // e.g. "GET"
  const path = event.path; // e.g. "/admin/plans/123456
  const resource = event.resource; // e.g. "/admin/plans/{id}
  const token = event.headers.Authorization.replace(/^[Bb]earer\s+/, "").trim();

  if (!plansTable || !keysTable || !path || !resource || !httpMethod || !token) {
    console.error(`HTTP 500: Precondition Fail: '${httpMethod}' '${path}' '${resource}' '${plansTable}' '${keysTable}' token.len=${token.len} `);
    return internalServerErrorResponse();
  }
  const jwt = parseJwt(token);
  console.log("JWT payload: ", JSON.stringify(jwt, null, 2));

  return deleteKeyById(keysTable, event.pathParameters.id, jwt);
};

async function deleteKeyById(tableName, id, jwt) {
  const getItemCommand = new GetItemCommand({
    TableName: tableName,
    Key: {
      id: {
        S: id,
      },
    },
  });

  const data = await dynamo.send(getItemCommand);
  console.log("DynamoFind ", JSON.stringify(data, 0, 2));

  const usagePlanId = data.Item.planId.S;
  const pool = findPoolForPlanId(usagePlanId);

  if (!pool) {
    return deleteSiloedKeyById(tableName, id, usagePlanId, jwt);
  } else {
    return deletePooledKeyById(tableName, id, pool, jwt);
  }
}

async function deleteSiloedKeyById(tableName, id, usagePlanId, jwt) {
  console.log("Delete Siloed Key ", id, usagePlanId);

  const deleteItemCommand = new DeleteItemCommand({
    TableName: tableName,
    Key: {
      id: {
        S: id,
      },
    },
  });

  const data = await dynamo.send(deleteItemCommand);
  console.log("Dynamo delete: ", JSON.stringify(data, null, 2));

  await apigateway.send(new DeleteUsagePlanKeyCommand({ keyId: id, usagePlanId: usagePlanId }));
  await apigateway.send(new DeleteApiKeyCommand({ apiKey: id }));

  return goodResponse(JSON.stringify(data));
}

async function deletePooledKeyById(tableName, id, pool, jwt) {
  console.log("Delete Pooled Key", id, JSON.stringify(pool, 0, 2));

  const deleteItemCommand = new DeleteItemCommand({
    TableName: tableName,
    Key: {
      id: {
        S: id,
      },
    },
  });

  const data = await dynamo.send(deleteItemCommand);
  console.log("Dynamo data: ", JSON.stringify(data, null, 2));

  return goodResponse(JSON.stringify(data));
}