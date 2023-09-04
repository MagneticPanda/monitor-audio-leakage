# Amazon Connect Audio Leakage Detector
## About
This project implements an Amazon Connect call recording leakage detector. The solution monitors if calls, which should be recorded, have indeed been recorded.

---

## How it Works

> TODO: Insert a solution architecture

The solution consists of the following main components:
- CloudWatch Logs Subscription Filter - A subscription filter that ingests real-time CloudWatch logs for the Connect instance log group. This filter detects incoming log events which sets the recording and analytics behaviour. Any identified records are cached into the DynamoDB table with an `INITIALISED` status. 
- DynamoDB Table - A non-relational database that caches the recording state of calls. See the DDB Table Strategy section for more information.
- Step Function - The state machine that orchestrates the polling and updating of the recording state of calls. See the Step Function Strategy section for more information.

### DDB Table Strategy
#### The `State` Field
- `INITIALISED`: The recording and analytics behaviour has been set for the contact from the CloudWatch sub filter
- `IN_PROGRESS - AGENT`: The contact is currently connected to an agent
- `IN_PROGRESS - QUEUE/IVR`
- `COMPLETED - AGENT`: The contact with an agent has been completed
- `COMPLETED - QUEUE/IVR`: The contact with the queue/IVR has been completed

#### The `RecordingState` Field
_These are the different attributes for entries with `COMPLETED - AGENT` states_
- `CALL_RECORDED_SUCCESS`: The call was successfully recorded
- `CALL_RECORDED_FAILURE`: The call was not recorded

#### What should happen to each state
- _`INITIALISED`, `IN_PROGRESS - AGENT`, `IN_PROGRESS - QUEUE/IVR` must be polled and updated accordingly_ 
- _`COMPLETED - QUEUE/IVR` (no AgentInfo) must be deleted on a schedule_
- _`COMPLETED - AGENT` (with AgentInfo) must have the recording bucket searched and update the `RecordState` field_

### Step Function Strategy
A lambda function will be invoked every 5-minutes (needs to run on mod 5 minutes eg: 13:00, 13:05 etc. rather than 13:01, 
13:06 etc.). The lambda has the sole duty of initiating a state machine with the following states:

- The entry state will be a task state that polls the `INITIALISED` records and updates their `State` accordingly
- This will be followed by the parallel state with 2 branches:
  - The fist parallel branch will have a task state will delete all records that have a `COMPLETED - QUEUE/IVR` state
  - The second parallel branch will have 2 sequential task states:
    - The first task state will poll the `IN_PROGRESS - AGENT` and `IN_PROGRESS - QUEUE/IVR` state and update accordingly
    - The second task state will poll the `COMPLETED - AGENT` states without a `RecordState` field and update accordingly

> The `State` field of these records are updated using the `DescribeContact` API. The `RecordingState` field is updated by checking the recording bucket.

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

## Future enhancements
- Add an SNS topic to notify when a call has not been recorded

---

## How to Deploy
This project contains source code and supporting files for a serverless application that you can deploy with the SAM CLI.
The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

To use the SAM CLI, you need the following tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

To deploy the solution in a client environment, set up your AWS CLI with the appropriate Access Key and Secret Key and run the following commands in your terminal.

```bash
sam package
sam deploy --guided
```

If you are experiencing any deployments issues please reach out to _sashen.moodley@dimensiondata.com_

## Resources
See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.
