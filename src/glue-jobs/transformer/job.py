import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ["JOB_NAME"])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

# Script generated for node Data Catalog table
DataCatalogtable_node1 = glueContext.create_dynamic_frame.from_catalog(
    database="dev-codemotion-cdk-etl",
    table_name="dev-codemotion-cdk-etl-raw-data",
    transformation_ctx="DataCatalogtable_node1",
)

# Script generated for node ApplyMapping
ApplyMapping_node2 = ApplyMapping.apply(
    frame=DataCatalogtable_node1,
    mappings=[
        ("stock_name", "string", "stock_name", "string"),
        ("price", "double", "price", "double"),
        ("ts", "long", "ts", "long"),
    ],
    transformation_ctx="ApplyMapping_node2",
)

# Script generated for node S3 bucket
S3bucket_node3 = glueContext.getSink(
    path="s3://dev-codemotion-cdk-etl-processed/transformed/",
    connection_type="s3",
    updateBehavior="UPDATE_IN_DATABASE",
    partitionKeys=[],
    compression="gzip",
    enableUpdateCatalog=True,
    transformation_ctx="S3bucket_node3",
)
S3bucket_node3.setCatalogInfo(
    catalogDatabase="dev-codemotion-cdk-etl",
    catalogTableName="dev-codemotion-cdk-etl-processed-data",
)
S3bucket_node3.setFormat("glueparquet")
S3bucket_node3.writeFrame(ApplyMapping_node2)
job.commit()
