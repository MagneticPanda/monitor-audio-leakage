# DDB Table Strategy
## The `State` Field
- `INITIALISED`: The recording and analytics behaviour has been set for the contact from the CloudWatch sub filter
- `IN_PROGRESS` - AGENT: The contact is currently connected to an agent
- `IN_PROGRESS` - QUEUE/IVR
- `COMPLETED` - AGENT: The contact with an agent has been completed
- `COMPLETED` - QUEUE/IVR: The contact with the queue/IVR has been completed

## The `RecordedState` Field
_These are the different attributes for entries with `COMPLETED - AGENT` states_
- CALL_RECORDED_SUCCESS
- CALL_RECORDED_FAILURE

## Plan of Action
### What should happen to each state
- _`INITIALISED`, `IN_PROGRESS - AGENT`, `IN_PROGRESS - QUEUE/IVR` must be polled and updated accordingly_ 
- _`COMPLETED - QUEUE/IVR` (no AgentInfo) must be deleted on a schedule_
- _`COMPLETED - AGENT` (with AgentInfo) must have the recording bucket searched and update the `RecordState` field_

### Implementation
Have a lambda function run on a 5-minute schedule (needs to run on mod 5 minutes eg: 13:00, 13:05 etc. rather than 13:01, 
13:06 etc.). The lambda will be response for initiating the following state machine (with an empty init event)

- The entry state will be a non-parallel task state that polls the `INITIALISED` state and updates accordingly
- This will be followed by the parallel state with 3 task states:
  - The fist parallel branch will have a task state will delete all records that have a `COMPLETED - QUEUE/IVR` state
  - The second parallel branch will have 2 sequential task states:
    - The first task state will poll the `IN_PROGRESS - AGENT` and `IN_PROGRESS - QUEUE/IVR` state and update accordingly
    - The seconds task state will poll the `COMPLETED - AGENT` states without a `RecordState` field and update accordingly

# `DescribeContact` API Responses
## [Completed] Spoke to agent
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


## [In Progress] On call with agent
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

## [Completed] Disconnected whilst in queue
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

## [In Progress] Waiting in queue
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