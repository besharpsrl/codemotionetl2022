import os
import json
import random
import datetime
import time
import boto3

ENV = os.environ.get('ENV', 'dev')
DATA_STREAMS = f'{ENV}-codemotion-cdk-etl-data-stream'


client = boto3.client('kinesis')

#   { name: 'stock_name', type: Schema.STRING, },
#   { name: 'price', type: Schema.DOUBLE, },
#   { name: 'ts', type: Schema.BIG_INT, },

def get_data():
    return {
        'stock_name': random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV']),
        'price': round(random.random() * 100, 2),
        'ts': int(time.time()),
    }


for _ in range(10):
    data = get_data()
    print(data)
    client.put_record(
        StreamName=DATA_STREAMS,
        Data=json.dumps(data),
        PartitionKey="partitionkey")

