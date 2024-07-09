const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { parseJwt, goodResponse, internalServerErrorResponse } = require("./utils");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

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
  const item = JSON.parse(event.body);
  console.log("JWT payload: ", JSON.stringify(jwt, null, 2));

  return updateKeyById(keysTable, item, jwt);
};

/**
 * PUT /admin/keys/{id}
 */
async function updateKeyById(tableName, item, jwt) {
  const updateItemCommand = new UpdateItemCommand({
    TableName: tableName,
    Key: marshall({ id: item.id }),
    ExpressionAttributeNames: {
      "#N": "name",
      "#D": "description",
      "#E": "enabled",
      "#O": "owner",
    },
    ExpressionAttributeValues: marshall({
      ":n": item.name,
      ":d": item.description,
      ":e": item.enabled,
      ":o": jwt.sub,
    }),
    UpdateExpression: "SET #N = :n, #D = :d, #E = :e",
    ConditionExpression: "#O = :o",
    ReturnValues: "UPDATED_NEW"
  });

  try {
    const data = await dynamo.send(updateItemCommand);
    console.log("Dynamo data: ", JSON.stringify(data.Attributes, null, 2));
    const response = goodResponse(JSON.stringify(unmarshall(data.Attributes)));
    return response;
  } catch (err) {
    console.error("HTTP 500: Dynamo responded: ", JSON.stringify(err, null, 2));
    return internalServerErrorResponse();
  }
}