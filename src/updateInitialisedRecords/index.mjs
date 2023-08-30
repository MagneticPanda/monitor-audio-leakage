import { DynamoDBClient, UpdateItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
const ddbClient = new DynamoDBClient();

import { ConnectClient, DescribeContactCommand } from "@aws-sdk/client-connect"
const connectClient = new ConnectClient();


const getNewState = (currentContactDescription) => {
    if (currentContactDescription.Contact.DisconnectTimestamp) {
        if (currentContactDescription.Contact.AgentInfo) {
            return 'COMPLETED - AGENT'
        } else {
            return 'COMPLETED - QUEUE/IVR'
        }
    } else {
        if (currentContactDescription.Contact.AgentInfo) {
            return 'IN_PROGRESS - AGENT'
        } else {
            return 'IN_PROGRESS - QUEUE/IVR'
        }
    }
};


export const handler = async (event, context) => {
    try {
        console.info('Incoming event: ', JSON.stringify(event, null, 2));
        console.info('Execution environment: ', JSON.stringify(context, null, 2));

        const { DDB_TABLE: tableName, CONNECT_ID: connectInstanceId } = process.env;

        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: '#ContactState = :state',
            ExpressionAttributeValues: {
                ':state': { S: 'INITIALISED' }
            },
            ExpressionAttributeNames: {
                '#ContactState': 'State'
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
                        'ContactId': { S: item.ContactId.S }
                    },
                    UpdateExpression: 'SET InitiationTimestamp = :initiationTimestamp , #State = :state , DisconnectTimestamp = :disconnectTimestamp',
                    ExpressionAttributeValues: {
                        ':state': { S: newState },
                        ':initiationTimestamp': { S: describeContactResult.Contact.InitiationTimestamp },
                        ':disconnectTimestamp': newState.startsWith('COMPLETED') ? { S: describeContactResult.Contact.DisconnectTimestamp } : { NULL: true }
                    },
                    ExpressionAttributeNames: {
                        '#State': 'State'
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