import os
import base64
import json

import boto3
import logging


ENV = os.environ.get("ENV", 'dev')
# DEDUP_TABLE = os.environ["DEDUP_TABLE"]

LOG_LEVEL = int(os.environ.get("LOG_LEVEL", 10))
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

s3 = boto3.resource('s3')
# dynamo = boto3.client('dynamodb')

def process_data(records):
    output = []
    # for record in records:
    #     try:
    #         payload = json.loads(base64.b64decode(record['data']).decode('utf-8'))
    #         print('payload:')
    #         print(payload)


    #         json_data = json.loads(data)
    #         # print('loaded S3 data:')
    #         # print(json_data)

    #         # Do custom processing on the payload here (flatten & add submission_id if needed)
    #         json_data_flat = formdata_flattener(json_data)
    #         if 'submission_id' not in json_data_flat.keys():
    #             json_data_flat['submission_id'] = submission_id


    #         output_record = {
    #             'recordId': record['recordId'],
    #             'result': 'Ok',
    #             'data': base64.b64encode(json.dumps(json_data_flat).encode('utf-8')).decode('utf-8')
    #         }
    #         output.append(output_record)
    #     except Exception as e:
    #         print('Exception for record: ')
    #         print(record)
    #         output_record = {
    #             'recordId': record['recordId'],
    #             'result': 'ProcessingFailed',
    #             'data': base64.b64encode(json.dumps(record).encode('utf-8')).decode('utf-8')
    #         }
    #         output.append(output_record)

    # # print('Returning: ')
    # # print(output)
    # print('Successfully processed {} records.'.format(len(records)))
    # print('Total records: {}'.format(len(records)))

    return output

def lambda_handler(event, context):
    print('[Event]: ', json.dumps(event))

    processed = process_data(event['records'])
    return {'records': processed}