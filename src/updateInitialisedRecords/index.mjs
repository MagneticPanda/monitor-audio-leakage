import { DynamoDBClient, UpdateItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
const ddbClient = new DynamoDBClient();

import { ConnectClient, DescribeContactCommand } from "@aws-sdk/client-connect"
const connectClient = new ConnectClient();


const getNewState = (currentContactDescription) => {
    if (currentContactDescription.DisconnectTimestamp) {
        if (currentContactDescription.AgentInfo) {
            return 'COMPLETED - AGENT'
        } else {
            return 'COMPLETED - QUEUE/IVR'
        }
    } else {
        if (currentContactDescription.AgentInfo) {
            return 'IN_PROGRESS - AGENT'
        } else {
            return 'IN_PROGRESS - QUEUE/IVR'
        }
    }
};


export const handler = async (event, context) => {
    try {
        console.info('Lambda event:', JSON.stringify(event, null, 2));
        console.info('Lambda environment: ', JSON.stringify(context, null, 2));

        const { DDB_TABLE: tableName, CONNECT_ID: connectInstanceId } = process.env;

        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: 'State = :state',
            ExpressionAttributeValues: {
                ':state': { S: 'INITIALISED' }
            }
        });
        const scanResponse = await ddbClient.send(scanCommand);

        if (scanResponse.Count !== 0) {
            for (let item of scanResponse.Items) {
                const command = new DescribeContactCommand({
                    InstanceId: connectInstanceId,
                    ContactId: item.ContactId.S
                });
                const describeContactResult = await connectClient.send(command);
                const newState = getNewState(describeContactResult);
                const updateItemCommand = new UpdateItemCommand({
                    TableName: tableName,
                    Key: {
                        'ContactId': item.ContactId
                    },
                    UpdateExpression: 'SET InitiationTimestamp = :initiationTimestamp, State = :state , DisconnectTimestamp = :disconnectTimestamp',
                    ExpressionAttributeValues: {
                        ':state': { S: newState },
                        ':initiationTimestamp': { S: describeContactResult.InitiationTimestamp },
                        ':disconnectTimestamp': newState.startsWith('COMPLETED') ? { S: describeContactResult.DisconnectTimestamp } : { NULL: true }
                    }
                });
                await ddbClient.send(updateItemCommand);
                console.info(`Updated contact ID: ${item.ContactId.S}`);
            }
        }

        const response = {
            statusCode: 200,
            message: `Polled ${scanResponse.Count} initialised records`
        };
        console.info('Response: ', response);
        return response;
    } catch (err) {
        const response = {
            statusCode: 500,
            error: err
        };
        console.error('Response: ', response);
        return response;
    }
}