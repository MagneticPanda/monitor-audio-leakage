import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
const ddbClient = new DynamoDBClient();
import * as zlib from 'zlib';

export const gunzipAsync = (payload) => {
    return new Promise((resolve, reject) => {
        zlib.gunzip(payload, (err, res) => {
            if (err) {
                console.error('Unable to unzip payload');
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

export const handler = async (event, context) => {
    try {
        console.info('Incoming event: ', event);
        console.info('Execution environment: ', context);

        const { DDB_TABLE: callRecordingsTable } = process.env;

        let payload = Buffer.from(event.awslogs.data, 'base64');
        const unzippedData = await gunzipAsync(payload);
        const logData = JSON.parse(unzippedData.toString('utf8'));
        console.info('Decoded log data: ', JSON.stringify(logData, null, 2));

        for (let logEvent of logData.logEvents) {
            console.info('Log event being processed: ', logEvent);

            if (logEvent.ContactFlowModuleType === 'SetRecordingBehavior' && logEvent.Parameters.RecordingBehaviorOption === 'Enable' && logEvent.Parameters.RecordingParticipantOption === 'All') {
                const putItemCommand = new PutItemCommand({
                    TableName: callRecordingsTable,
                    Item: {
                        'ContactId': { S: logEvent.ContactId },
                        'State': { S: 'INITIALISED' },
                        'InitiationTimestamp': { NULL: true },
                        'DisconnectTimestamp': { NULL: true },
                        'RecordingState': { NULL: true }
                    }
                });
                await ddbClient.send(putItemCommand);
                console.info(`Initialised contact ID: ${logEvent.ContactId}`);
            }
        }

    } catch (err) {
        console.error(err);
        const response = {
            statusCode: 500,
            error: err
        }
        console.info('Response: ', response);
        return response;
    }
}