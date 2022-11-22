import os
import json
import time
import boto3
from botocore.exceptions import ClientError

ENVIRONMENT = os.environ['ENVIRONMENT']
CRAWLER_NAME = os.environ['CRAWLER_NAME']

# ENVIRONMENT = os.environ.get('ENVIRONMENT', 'prod')
# CRAWLER_NAME = os.environ.get('CRAWLER_NAME', 'customer-segmentation-production-crawler-dwh-vestebene')

glue = boto3.client('glue')


def lambda_handler(event, context):
    print('[ EVENT ]:', json.dumps(event))

    first_iteration = True
    while True:
        try:
            if first_iteration:
                crawler_response = glue.start_crawler(Name=CRAWLER_NAME)
                first_iteration = False
                print('Crawler started ...')
                time.sleep(1*60) # 1 minute

            response = glue.get_crawler(Name=CRAWLER_NAME)
            print(response.keys())
            crawler_status = response['Crawler']['State'] # 'READY'|'RUNNING'|'STOPPING',

            if crawler_status == 'READY':
                print('Crawler finished! Stopping ...')
                return {
                    "ExecutedVersion": "$LATEST",
                    "StatusCode": 200
                }

            print('Crawler still running! Waiting ...')
            time.sleep(1*60) # 1 minute
        except ClientError as e:
            print(e)
            raise e