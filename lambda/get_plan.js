const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { parseJwt, goodResponse, internalServerErrorResponse } = require("./utils");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamo = new DynamoDBClient({ region: "eu-north-1" });

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

  const id = event.pathParameters.id;
  return getPlanById(plansTable, id);
};

/**
 * GET /admin/plans/:id
 */
async function getPlanById(tableName, id) {
  const getItemCommand = new GetItemCommand({
    TableName: tableName,
    Key: {
      id: {
        S: id,
      },
    },
  });

  try {
    const data = await dynamo.send(getItemCommand);
    console.log("Dynamo data: ", JSON.stringify(data.Item, null, 2));
    const response = goodResponse(JSON.stringify(unmarshall(data.Item)));
    return response;
  } catch (err) {
    console.error("HTTP 500: Dynamo responded: ", JSON.stringify(err, null, 2));
    return internalServerErrorResponse();
  }
}