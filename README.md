# Monitor Audio Leakage
## About
This project contains an implementation that checks if calls, which should be recorded, have indeed been recorded. 

---

## How it Works

> TODO: Insert a solution architecture overview

### DDB Table Strategy
#### The `State` Field
- `INITIALISED`: The recording and analytics behaviour has been set for the contact from the CloudWatch sub filter
- `IN_PROGRESS - AGENT`: The contact is currently connected to an agent
- `IN_PROGRESS - QUEUE/IVR`
- `COMPLETED - AGENT`: The contact with an agent has been completed
- `COMPLETED - QUEUE/IVR`: The contact with the queue/IVR has been completed

#### The `RecordedState` Field
_These are the different attributes for entries with `COMPLETED - AGENT` states_
- `CALL_RECORDED_SUCCESS`: The call was successfully recorded
- `CALL_RECORDED_FAILURE`: The call was not recorded

### Plan of Action
#### What should happen to each state
- _`INITIALISED`, `IN_PROGRESS - AGENT`, `IN_PROGRESS - QUEUE/IVR` must be polled and updated accordingly_ 
- _`COMPLETED - QUEUE/IVR` (no AgentInfo) must be deleted on a schedule_
- _`COMPLETED - AGENT` (with AgentInfo) must have the recording bucket searched and update the `RecordState` field_

#### Implementation
Have a lambda function run on a 5-minute schedule (needs to run on mod 5 minutes eg: 13:00, 13:05 etc. rather than 13:01, 
13:06 etc.). The lambda will be response for initiating the following state machine (with an empty init event)

- The entry state will be a task state that polls the `INITIALISED` records and updates their `State` accordingly
- This will be followed by the parallel state with 2 branches:
  - The fist parallel branch will have a task state will delete all records that have a `COMPLETED - QUEUE/IVR` state
  - The second parallel branch will have 2 sequential task states:
    - The first task state will poll the `IN_PROGRESS - AGENT` and `IN_PROGRESS - QUEUE/IVR` state and update accordingly
    - The seconds task state will poll the `COMPLETED - AGENT` states without a `RecordState` field and update accordingly

#### Future enhancements
- Add a SNS topic to notify when a call has not been recorded

### `DescribeContact` API Responses
#### [Completed] Spoke to agent
```
Describe Contact Response:  {
  '$metadata': {
    httpStatusCode: 200,
    requestId: '8445829e-f235-4100-a00e-74b60a252750',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  },
  Contact: {
    AgentInfo: {
      ConnectedToAgentTimestamp: 2023-08-29T10:30:11.038Z,
      Id: '59ede75e-26d7-44f9-bf20-32e6bfc378af'
    },
    Arn: 'arn:aws:connect:af-south-1:687244881512:instance/bd7c61d1-6722-4b4f-8c9c-6253e5a85c32/contact/955c07e1-af64-4094-9c16-c59995ecdcbe',
    Channel: 'VOICE',
    DisconnectTimestamp: 2023-08-29T10:31:10.343Z,
    Id: '955c07e1-af64-4094-9c16-c59995ecdcbe',
    InitiationMethod: 'INBOUND',
    InitiationTimestamp: 2023-08-29T10:29:57.871Z,
    LastUpdateTimestamp: 2023-08-29T10:31:10.343Z,
    QueueInfo: {
      EnqueueTimestamp: 2023-08-29T10:30:04.641Z,
      Id: '54b468a3-86b1-4746-aeb5-c31b62eecaa2'
    }
  }
}
```


#### [In Progress] On call with agent
```
Describe Contact Response:  {
  '$metadata': {
    httpStatusCode: 200,
    requestId: '1eea2486-a474-40ad-9146-131b912ce828',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  },
  Contact: {
    AgentInfo: {
      ConnectedToAgentTimestamp: 2023-08-29T21:22:59.548Z,
      Id: '59ede75e-26d7-44f9-bf20-32e6bfc378af'
    },
    Arn: 'arn:aws:connect:af-south-1:687244881512:instance/bd7c61d1-6722-4b4f-8c9c-6253e5a85c32/contact/bd749cef-008a-4130-b137-0dfdfd2acf9c',
    Channel: 'VOICE',
    Id: 'bd749cef-008a-4130-b137-0dfdfd2acf9c',
    InitiationMethod: 'INBOUND',
    InitiationTimestamp: 2023-08-29T21:22:44.141Z,
    LastUpdateTimestamp: 2023-08-29T21:22:59.604Z,
    QueueInfo: {
      EnqueueTimestamp: 2023-08-29T21:22:54.402Z,
      Id: '936732c5-790d-4cb1-80f1-001e9997f92e'
    }
  }
}
```

#### [Completed] Disconnected whilst in queue
```
Describe Contact Response:  {
  '$metadata': {
    httpStatusCode: 200,
    requestId: '9e1402a2-6628-4553-9c5e-586d5e309be3',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  },
  Contact: {
    Arn: 'arn:aws:connect:af-south-1:687244881512:instance/bd7c61d1-6722-4b4f-8c9c-6253e5a85c32/contact/b1797f20-7c75-48d9-94a6-6dfbeb539105',
    Channel: 'VOICE',
    DisconnectTimestamp: 2023-08-29T11:18:16.018Z,
    Id: 'b1797f20-7c75-48d9-94a6-6dfbeb539105',
    InitiationMethod: 'INBOUND',
    InitiationTimestamp: 2023-08-29T11:18:02.539Z,
    LastUpdateTimestamp: 2023-08-29T11:18:16.018Z,
    QueueInfo: {
      EnqueueTimestamp: 2023-08-29T11:18:11.029Z,
      Id: '54b468a3-86b1-4746-aeb5-c31b62eecaa2'
    }
  }
}
```

#### [In Progress] Waiting in queue
```
Describe Contact Response:  {
  '$metadata': {
    httpStatusCode: 200,
    requestId: '7f8bf6dd-1686-478a-b2db-9e98c8e3008c',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  },
  Contact: {
    Arn: 'arn:aws:connect:af-south-1:687244881512:instance/bd7c61d1-6722-4b4f-8c9c-6253e5a85c32/contact/a346ae06-accc-4101-8cf1-beb322f47c6a',
    Channel: 'VOICE',
    Id: 'a346ae06-accc-4101-8cf1-beb322f47c6a',
    InitiationMethod: 'INBOUND',
    InitiationTimestamp: 2023-08-29T21:27:49.761Z,
    LastUpdateTimestamp: 2023-08-29T21:27:59.558Z,
    QueueInfo: {
      EnqueueTimestamp: 2023-08-29T21:27:59.089Z,
      Id: '54b468a3-86b1-4746-aeb5-c31b62eecaa2'
    }
  }
}
```

---

## How to Deploy
This project contains source code and supporting files for a serverless application that you can deploy with the SAM CLI.
The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

To use the SAM CLI, you need the following tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

To build and deploy your application for the first time, run the following in your shell:

```bash
sam build
sam deploy --guided
```

The first command will build the source of your application. The second command will package and deploy your application to AWS, with a series of prompts:

* **Stack Name**: The name of the stack to deploy to CloudFormation. This should be unique to your account and region, and a good starting point would be something matching your project name.
* **AWS Region**: The AWS region you want to deploy your app to.
* **Confirm changes before deploy**: If set to yes, any change sets will be shown to you before execution for manual review. If set to no, the AWS SAM CLI will automatically deploy application changes.
* **Allow SAM CLI IAM role creation**: Many AWS SAM templates, including this example, create AWS IAM roles required for the AWS Lambda function(s) included to access AWS services. By default, these are scoped down to minimum required permissions. To deploy an AWS CloudFormation stack which creates or modifies IAM roles, the `CAPABILITY_IAM` value for `capabilities` must be provided. If permission isn't provided through this prompt, to deploy this example you must explicitly pass `--capabilities CAPABILITY_IAM` to the `sam deploy` command.
* **Save arguments to samconfig.toml**: If set to yes, your choices will be saved to a configuration file inside the project, so that in the future you can just re-run `sam deploy` without parameters to deploy changes to your application.

You can find your API Gateway Endpoint URL in the output values displayed after deployment.

## Use the SAM CLI to build and test locally

Build your application with the `sam build` command.

```bash
monitor-audio-leakage$ sam build
```

The SAM CLI installs dependencies defined in `hello-world/package.json`, creates a deployment package, and saves it in the `.aws-sam/build` folder.

Test a single function by invoking it directly with a test event. An event is a JSON document that represents the input that the function receives from the event source. Test events are included in the `events` folder in this project.

Run functions locally and invoke them with the `sam local invoke` command.

```bash
monitor-audio-leakage$ sam local invoke HelloWorldFunction --event events/event.json
```

The SAM CLI can also emulate your application's API. Use the `sam local start-api` to run the API locally on port 3000.

```bash
monitor-audio-leakage$ sam local start-api
monitor-audio-leakage$ curl http://localhost:3000/
```

The SAM CLI reads the application template to determine the API's routes and the functions that they invoke. The `Events` property on each function's definition includes the route and method for each path.

```yaml
      Events:
        HelloWorld:
          Type: Api
          Properties:
            Path: /hello
            Method: get
```

## Add a resource to your application
The application template uses AWS Serverless Application Model (AWS SAM) to define application resources. AWS SAM is an extension of AWS CloudFormation with a simpler syntax for configuring common serverless application resources such as functions, triggers, and APIs. For resources not included in [the SAM specification](https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md), you can use standard [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) resource types.

## Fetch, tail, and filter Lambda function logs

To simplify troubleshooting, SAM CLI has a command called `sam logs`. `sam logs` lets you fetch logs generated by your deployed Lambda function from the command line. In addition to printing the logs on the terminal, this command has several nifty features to help you quickly find the bug.

`NOTE`: This command works for all AWS Lambda functions; not just the ones you deploy using SAM.

```bash
monitor-audio-leakage$ sam logs -n HelloWorldFunction --stack-name monitor-audio-leakage --tail
```

You can find more information and examples about filtering Lambda function logs in the [SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-logging.html).

## Unit tests

Tests are defined in the `hello-world/tests` folder in this project. Use NPM to install the [Mocha test framework](https://mochajs.org/) and run unit tests.

```bash
monitor-audio-leakage$ cd hello-world
hello-world$ npm install
hello-world$ npm run test
```

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
sam delete --stack-name monitor-audio-leakage
```

## Resources

See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello world samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)
