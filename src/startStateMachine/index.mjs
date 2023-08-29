import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
const stepFunctionsClient = new SFNClient();

export const handler = async (event, context) => {
    try {
        console.info('Lambda event:', JSON.stringify(event, null, 2));
        console.info('Lambda environment: ', JSON.stringify(context, null, 2));

        const { STATE_MACHINE_ARN: stateMachineArn } = process.env;

        const startExecutionCommand = new StartExecutionCommand({
            stateMachineArn: stateMachineArn
        });
        const stateMachineResp = await stepFunctionsClient.send(startExecutionCommand);

        const response = {
            statusCode: 200,
            stateMachineArn: stateMachineArn,
            stateMachineExecutionArn: stateMachineResp.executionArn
        };
        console.info('Response: ', response);
        return response;
    } catch (err) {
        console.error('An error occurred: ', err);
        const response = {
            statusCode: 500,
            error: err
        };
        console.info('Response: ', response);
        return response;
    }
}