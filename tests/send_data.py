import os
import json
import random
import datetime
import boto3

ENV = os.environ.get('ENV', 'dev')
DATA_STREAMS = f'{ENV}-codemotion-cdk-etl-data-streamInfo'


client = boto3.client('kinesis')

        #   { name: 'id', type: Schema.STRING, },
        #   { name: 'stock_name', type: Schema.STRING, },
        #   { name: 'price', type: Schema.DOUBLE, },
        #   { name: 'ts', type: Schema.BIG_INT, },

def get_data():
    return {
        'stock_name': random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV']),
        'price': round(random.random() * 100, 2),
        'ts': datetime.datetime.now().isoformat(),
    }


def generate(stream_name, kinesis_client):
    while True:
        data = get_data()
        print(data)
        # kinesis_client.put_record(
        #     StreamName=DATA_STREAMS,
        #     Data=json.dumps(data),
        #     PartitionKey="partitionkey")

print(datetime.datetime.now().isoformat())