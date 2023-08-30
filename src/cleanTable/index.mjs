import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
const ddbClient = new DynamoDBClient();

export const handler = async (event, context) => {
    try {

        console.info('Input event: ', JSON.stringify(event, null, 2));
        console.info('Execution environment: ', JSON.stringify(context));

        const { DDB_TABLE: tableName } = process.env;

        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: '#State = :state',
            ExpressionAttributeValues: {
                ':state': { S: 'COMPLETED - QUEUE/IVR' }
            },
            ExpressionAttributeNames: {
                '#State': 'State'
            }
        });
        const scanResult = await ddbClient.send(scanCommand);

        const deletePromises = scanResult.Items.map(async (item) => {
            const deleteCommand = new DeleteItemCommand({
                TableName: tableName,
                Key: {
                    'ContactId': {S: item.ContactId.S}
                }
            });
            return await ddbClient.send(deleteCommand);
        });
        await Promise.all(deletePromises);

        const response = {
            statusCode: 200,
            message: `Deleted ${scanResult.Items.length} items from ${tableName}`
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