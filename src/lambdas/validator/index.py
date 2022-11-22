import os
import base64
import json

import boto3
import logging


ENV = os.environ.get("ENV", 'dev')
COUNTRY = os.environ["COUNTRY"]
DEDUP_TABLE = os.environ["DEDUP_TABLE"]

LOG_LEVEL = int(os.environ.get("LOG_LEVEL", 10))
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

s3 = boto3.resource('s3')
dynamo = boto3.client('dynamodb')

def formdata_flattener(formdata):
    flat_result = {}
    for k in formdata['data'].keys():
      flat_result[f'data_{k}'] = formdata['data'][k]
    for k in formdata['metadata'].keys():
      flat_result[f'metadata_{k}'] = formdata['metadata'][k]
    flat_result["state"] = formdata["state"]
    return flat_result

def process_formdata(records):
    output = []
    for record in records:
        try:
            payload = json.loads(base64.b64decode(record['data']).decode('utf-8'))
            # print('payload:')
            # print(payload)
            if payload.get('Event', '') == 's3:TestEvent':
                output_record = {
                    'recordId': record['recordId'],
                    'result': 'Dropped',
                    'data': base64.b64encode(json.dumps({}).encode('utf-8')).decode('utf-8')
                }
                output.append(output_record)
                print('Test event found, skipping ...')
                continue

            s3_bucket = payload['Records'][0]['s3']['bucket']['name']
            obj_key = payload['Records'][0]['s3']['object']['key']
            submission_id = obj_key.split('/')[1] # 'lebanon3/submission_id/formdata.json'

            # read S3 file
            s3_object = s3.Object(s3_bucket, obj_key)
            data = s3_object.get()['Body'].read().decode('utf-8')
            json_data = json.loads(data)
            # print('loaded S3 data:')
            # print(json_data)

            # Do custom processing on the payload here (flatten & add submission_id if needed)
            json_data_flat = formdata_flattener(json_data)
            if 'submission_id' not in json_data_flat.keys():
                json_data_flat['submission_id'] = submission_id
            
            # checking if the submission is already in the dedup table
            try:
                dynamo.put_item(
                    TableName=DEDUP_TABLE,
                    Item={'submission_id': {'S': submission_id}, 's3_key': {'S': obj_key}},
                    ConditionExpression='attribute_not_exists(submission_id)'
                )
            except dynamo.exceptions.ConditionalCheckFailedException:
                output_record = {
                    'recordId': record['recordId'],
                    'result': 'Dropped',
                    'data': base64.b64encode(json.dumps({}).encode('utf-8')).decode('utf-8')
                }
                output.append(output_record)
                print(f'SubmissionID {submission_id} already inserted, skipping ...')
                continue

            output_record = {
                'recordId': record['recordId'],
                'result': 'Ok',
                'data': base64.b64encode(json.dumps(json_data_flat).encode('utf-8')).decode('utf-8')
            }
            output.append(output_record)
        except Exception as e:
            print('Exception for record: ')
            print(record)
            output_record = {
                'recordId': record['recordId'],
                'result': 'ProcessingFailed',
                'data': base64.b64encode(json.dumps(record).encode('utf-8')).decode('utf-8')
            }
            output.append(output_record)

    # print('Returning: ')
    # print(output)
    print('Successfully processed {} records.'.format(len(records)))
    print('Total records: {}'.format(len(records)))

    return output

def lambda_handler(event, context):
    print('[Event]: ', json.dumps(event))

    processed = process_formdata(event['records'])
    return {'records': processed}