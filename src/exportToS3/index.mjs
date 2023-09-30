import { DynamoDBClient, DynamoDBClientConfig, ExportTableToPointInTimeCommand } from '@aws-sdk/client-dynamodb';
import { getSastDateTime, getSastDateTimeNDaysAgo } from './utils/dateTimeUtils.mjs';

const ddbConfig = new DynamoDBClientConfig({ region: 'af-south-1' });
const ddbClient = new DynamoDBClient(ddbConfig);

export const handler = async (event, context) => {
    try {
        const dateObj = new Date();

        console.info('Incoming event: ', event);
        console.info('Execution context: ', context);

        const { EXPORT_BUCKET_NAME, TABLE_ARN } = process.env;
        const exportToPitrCommand = new ExportTableToPointInTimeCommand({
            TableArn: TABLE_ARN,
            S3Bucket: EXPORT_BUCKET_NAME,
            ExportType: 'INCREMENTAL_EXPORT',
            IncrementalExportSpecification: {
                ExportFromTime: getSastDateTimeNDaysAgo(1, true),
                ExportToTime: getSastDateTime(dateObj, true),
                ExportViewType: 'NEW_AND_OLD_IMAGES',
            },
            ExportFormat: 'DYNAMODB_JSON',
            S3SseAlgorithm: 'AES256',
        });
        const exportToPitrResponse = await ddbClient.send(exportToPitrCommand);
        console.info('Incremental export response: ', exportToPitrResponse);

        const response = {
            statusCode: exportToPitrResponse.$metadata.httpStatusCode,
            message: 'Export to S3 completed successfully',
            error: false,
            errorMessage: null,
        };
        console.info('Response: ', response);
        return response;
    } catch (e) {
        const response = {
            statusCode: 500,
            message: 'Un unexpected error occurred',
            error: true,
            errorMessage: e instanceof Error ? e.message : e.toString(),
        };
        console.info('Response: ', response);
        return response;
    }
};
