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
        console.info('Lambda event:', JSON.stringify(event, null, 2));
        console.info('Lambda environment: ', JSON.stringify(context, null, 2));

        const { DDB_TABLE: tableName, CONNECT_ID: connectInstanceId } = process.env;

        // scanning the table for records where 'State' is 'IN_PROGRESS - QUEUE/IVR' or 'IN_PROGRESS - AGENT'
        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: '#State IN (:state1 , :state2)',
            ExpressionAttributeValues: {
                ':state1': { S: 'IN_PROGRESS - QUEUE/IVR' },
                ':state2': { S: 'IN_PROGRESS - AGENT' }
            },
            ExpressionAttributeNames: {
                '#State': 'State'
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
                    UpdateExpression: 'SET InitiationTimestamp = :initiationTimestamp, #State = :state , DisconnectTimestamp = :disconnectTimestamp',
                    ExpressionAttributeValues: {
                        ':state': { S: newState },
                        ':disconnectTimestamp': newState.startsWith('COMPLETED') ? { S: describeContactResult.Contact.DisconnectTimestamp } : { NULL: true }
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