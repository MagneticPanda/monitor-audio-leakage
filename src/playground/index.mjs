import { ConnectClient, DescribeContactCommand, GetContactAttributesCommand } from "@aws-sdk/client-connect"
const connectClient = new ConnectClient();

export const handler = async (event, context) => {
    try {
        console.info('Incoming event: ', event);
        console.info('Execution environment: ', context);

        const instanceId  = 'bd7c61d1-6722-4b4f-8c9c-6253e5a85c32';
        const { contactId } = event;

        const command = new DescribeContactCommand({
            InstanceId: instanceId,
            ContactId: contactId
        });
        const response = await connectClient.send(command);
        console.info('Describe Contact Response: ', response);

        const disconnectTimestamp = response.Contact.DisconnectTimestamp;
        // converting the timestamp from 2023-08-29T10:31:10.343Z (UTC) to SAST (UTC+2)
        const disconnectTimestampSAST = new Date(disconnectTimestamp).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
        console.info('SA date', disconnectTimestampSAST);
        const date = disconnectTimestampSAST.split(',')[0];
        console.info('Disconnect Timestamp: ', date);


        return {
            statusCode: 200,
            message: 'Successfully fetched contact details'
        };
    } catch (err) {
        console.error('Error encountered: ', err);
        return {
            statusCode: 500,
            error: err
        };
    }
};

const { describeContactResponse } = await handler({ contactId: 'd4447241-4114-442c-9724-585116e47a2c'});
// handler({ contactId: 'b1797f20-7c75-48d9-94a6-6dfbeb539105'});
// handler({ contactId: '767cdca6-2acd-4db4-9d1d-04a5859d6e0d'});
// handler({ contactId: 'bd749cef-008a-4130-b137-0dfdfd2acf9c'});
// const { describeContactResponse } = handler({ contactId: 'a346ae06-accc-4101-8cf1-beb322f47c6a'});
// const disconnectTimestamp = describeContactResponse.Contact.DisconnectTimestamp;
// console.info('Disconnect Timestamp: ', disconnectTimestamp);