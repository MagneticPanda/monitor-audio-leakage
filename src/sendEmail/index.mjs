import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getSastDateTime } from "./utils/dateTimeUtils.mjs";
const cloudWatchClient = new CloudWatchClient();
const sesClient = new SESv2Client();

export const handler = async (event, context) => {
    try {
        console.info('Incoming event: ', event);
        console.info('Execution environment: ', context);

        const { CONNECT_INSTANCE_ID, FROM_EMAIL_ADDRESS, CALL_RECORDING_DASHBOARD_LINK } = process.env;

        const getMetricDataCommand = new GetMetricDataCommand({
            MetricDataQueries: [
                {
                    Id: 'metric1',
                    MetricStat: {
                        Metric: {
                            Dimensions: [
                                {
                                    Name: 'InstanceId',
                                    Value: CONNECT_INSTANCE_ID
                                },
                                {
                                    Name: 'MetricGroup',
                                    Value: 'CallRecordings'
                                }
                            ],
                            MetricName: 'CallRecordingUploadError',
                            Namespace: 'AWS/Connect'
                        },
                        Period: 86400,
                        Stat: 'Sum',
                        Unit: 'Count'
                    },
                    ReturnData: true,
                },
                {
                    Id: 'metric2',
                    MetricStat: {
                        Metric: {
                            Dimensions: [
                                {
                                    Name: 'InstanceId',
                                    Value: CONNECT_INSTANCE_ID
                                },
                                {
                                    Name: 'MetricGroup',
                                    Value: 'VoiceCalls'
                                }
                            ],
                            MetricName: 'CallsPerInterval',
                            Namespace: 'AWS/Connect'
                        },
                        Period: 86400,
                        Stat: 'Sum',
                        Unit: 'Count'
                    },
                    ReturnData: true,
                }
            ],
            StartTime: new Date(Date.now() - 86400000),
            EndTime: new Date(),
        });
        const getMetricDataResult = await cloudWatchClient.send(getMetricDataCommand);
        console.info('Get metric data result: ', JSON.stringify(getMetricDataResult, null, 2));

        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - 1);
        const prevSastDate = getSastDateTime(dateObj, false).split('T')[0];

        const sendEmailCommand = new SendEmailCommand({
            FromEmailAddress: FROM_EMAIL_ADDRESS,
            Destination: {
                ToAddresses: [
                    "sashen.moodley@dimensiondata.com"
                ],
                CcAddresses: [
                    "jeston.perumal@dimensiondata.com",
                    "deslin.nadar@dimensiondata.com",
                    "marnus.botha@dimensiondata.com"
                ]
            },
            ReplyToAddresses: [
                FROM_EMAIL_ADDRESS
            ],
            Content: {
                Simple: {
                    Subject: {
                        Data: `Call Recordings Daily Summary - ${prevSastDate}`
                    },
                    Body: {
                        Html: {
                            Charset: "UTF-8",
                            Data: `Good day,<br/><br/>I hope you are well.<br/><br/>Please find the daily summary of call recordings for ${prevSastDate} below:<br/>- Total calls: ${getMetricDataResult.MetricDataResults[1].Values[0]}<br/>- Call recording upload errors: ${getMetricDataResult.MetricDataResults[0].Values[0]}<br/><br/>You can also find this information on the <a href="${CALL_RECORDING_DASHBOARD_LINK}">Call Recording CloudWatch Dashboard</a>.<br/><br/>Regards,<br/>Sashen Moodley<br/><br/><em>Please note: This is an automated email.</em>`
                        }
                    }
                }
            }
        });
        const sendEmailResult = await sesClient.send(sendEmailCommand);
        console.info('Send email result: ', JSON.stringify(sendEmailResult, null, 2));

        const response = {
            statusCode: 200,
            message: 'Successfully retrieved metrics and sent email.',
            error: false,
            errorDetails: null,
            data: {
                callRecordingUploadErrorCount: getMetricDataResult.MetricDataResults[0].Values[0],
                totalCallsCount: getMetricDataResult.MetricDataResults[1].Values[0],
                date: prevSastDate
            }
        };

        console.info('Response: ', response);
        return response;

    } catch (err) {
        const response = {
            statusCode: 500,
            message: 'An unexpected error occurred.',
            error: true,
            errorDetails: err,
            data: null
        };
        console.info('Response: ', response);
        return response;
    }
}