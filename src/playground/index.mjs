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

        const getContactAttributesCommand = new GetContactAttributesCommand({
            InstanceId: instanceId,
            InitialContactId: contactId
        });
        const contactAttributesResponse = await connectClient.send(getContactAttributesCommand);
        console.info('Contact Attributes Response: ', contactAttributesResponse);

        return {
            statusCode: 200,
            message: 'Successfully fetched contact details',
        };
    } catch (err) {
        console.error('Error encountered: ', err);
        return {
            statusCode: 500,
            error: err
        };
    }
};

// handler({ contactId: '955c07e1-af64-4094-9c16-c59995ecdcbe'});
// handler({ contactId: 'b1797f20-7c75-48d9-94a6-6dfbeb539105'});
// handler({ contactId: '767cdca6-2acd-4db4-9d1d-04a5859d6e0d'});
// handler({ contactId: 'bd749cef-008a-4130-b137-0dfdfd2acf9c'});
handler({ contactId: 'a346ae06-accc-4101-8cf1-beb322f47c6a'});