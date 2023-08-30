import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
const ddbClient = new DynamoDBClient();

import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";
const s3Client = new S3Client();

export const handler = async (event, context) => {
    try {
        console.info('Incoming event:', JSON.stringify(event, null, 2));
        console.info('Execution environment: ', JSON.stringify(context, null, 2));

        const { DDB_TABLE: tableName, RECORDING_BUCKET: recordingBucketName, CONNECT_ALIAS: instanceAlias } = process.env;

        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: 'RecordingState = :recordingState AND #State = :state',
            ExpressionAttributeValues: {
                ':recordingState': { NULL: true },
                ':state': { S: 'COMPLETED - AGENT' }
            },
            ExpressionAttributeNames: {
                '#State': 'State'
            }
        });
        const scanResult = await ddbClient.send(scanCommand);
        console.info('Scan result: ', scanResult);

        if (scanResult.Items.length !== 0) {
            for (let item of scanResult.Items) {
                let updated = false;
                const disconnectTimestamp = item.DisconnectTimestamp.S;
                const disconnectDateSAST = new Date(disconnectTimestamp).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }).split(',')[0];

                // TODO: Add logic to handle more than 1000 objects
                const listObjectsCommand = new ListObjectsCommand({
                    Bucket: recordingBucketName,
                    Prefix: `connect/${instanceAlias}/CallRecordings/${disconnectDateSAST}/`,
                    Delimiter: '/',
                    MaxKeys: 1000,
                });
                const listObjectsResult = await s3Client.send(listObjectsCommand);
                console.info('S3 bucket list objects result: ', listObjectsResult);

                for (let object of listObjectsResult.Contents) {
                    if (object.Key.includes(item.ContactId.S)) {
                        const updateItemCommand = new UpdateItemCommand({
                            TableName: tableName,
                            Key: {
                                'ContactId': { S: item.ContactId.S }
                            },
                            UpdateExpression: 'SET RecordingState = :recordingState',
                            ExpressionAttributeValues: {
                                ':recordingState': { S: 'CALL_RECORDED_SUCCESS' }
                            }
                        });
                        await ddbClient.send(updateItemCommand);
                        updated = true;
                        console.info(`Contact ID: ${item.ContactId.S} --> 'CALL_RECORDED_SUCCESS'`);
                    }
                }
                if (!updated) {
                    const updateItemCommand = new UpdateItemCommand({
                        TableName: tableName,
                        Key: {
                            'ContactId': {S: item.ContactId.S}
                        },
                        UpdateExpression: 'SET RecordingState = :recordingState',
                        ExpressionAttributeValues: {
                            ':recordingState': {S: 'CALL_RECORDED_FAILURE'}
                        }
                    });
                    await ddbClient.send(updateItemCommand);
                    console.info(`Contact ID: ${item.ContactId.S} --> 'CALL_RECORDED_FAILURE'`);
                }
            }

            const response = {
                statusCode: 200,
                message: 'Successfully updated all records\' recording states'
            };
            console.info('Response: ', response);
            return response;
        }

        const response = {
            statusCode: 200,
            message: 'No null \'COMPLETED - AGENT\' records to update'
        };
        console.info('Response: ', response);
        return response;

    } catch (err) {
        const response = {
            statusCode: 500,
            error: err
        };
        console.error('Error encountered:', JSON.stringify(response, null, 2));
        return response;
    }
}