import os
import base64
import json

import boto3
import logging


ENV = os.environ.get("ENV", 'dev')

needed_fields = set(['stock_name', 'price', 'ts'])

LOG_LEVEL = int(os.environ.get("LOG_LEVEL", 10))
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

s3 = boto3.resource('s3')

def process_data(records):
    output = []
    for record in records:
        try:
            payload = json.loads(base64.b64decode(record['data']).decode('utf-8'))

            # Validate
            payload_fields = set(payload.keys())
            if needed_fields-payload_fields: # some needed fields are not in the payload
                print('Invalid payload, missing some needed keys...')
                raise Exception

            output_record = {
                'recordId': record['recordId'],
                'result': 'Ok',
                'data': base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')
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

    print('Processed records: {}'.format(len(records)))

    return output

def lambda_handler(event, context):
    print('[Event]: ', json.dumps(event))

    processed = process_data(event['records'])
    return {'records': processed}