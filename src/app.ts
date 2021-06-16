import { S3Client, S3ClientConfig, ListObjectsV2CommandInput, GetObjectCommandInput } from "@aws-sdk/client-s3";
import { listS3Objects } from "./lib/list_s3_objects";
import fs from "fs";
import { getS3Objects } from "./lib/get_s3_object";
import { createArchiver } from "./lib/create_archiver";
import { SourceBucketInfo, DestBucketInfo } from "./types";

async function main(SourceBucket: SourceBucketInfo, DestBucket?: DestBucketInfo) {
  const clientConfig: S3ClientConfig = {
    region: SourceBucket.Region,
  };

  const client = new S3Client(clientConfig);
  const listConfig: ListObjectsV2CommandInput = {
    Bucket: SourceBucket.Bucket,
    // MaxKeys: 2,
    Prefix: SourceBucket.Prefix,
  };

  const output = fs.createWriteStream(__dirname + "/example.zip");
  const archive = createArchiver(output, {
    zlib: { level: 9 }, // set compression lvl
  });

  try {
    const items = await listS3Objects(client, listConfig);

    for (const item of items) {
      const config: GetObjectCommandInput = {
        Bucket: listConfig.Bucket,
        ExpectedBucketOwner: item.Owner?.ID,
        Key: item.Key,
        IfUnmodifiedSince: item.LastModified,
      };

      const readStream = await getS3Objects(client, config);
      console.log(item.Key);
      archive.append(readStream, { name: item.Key! });
    }

    // Finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand.
    archive.finalize();
  } catch (err) {
    console.log(err.message);
  }
}

main({
  Bucket: "data-cedric",
  Prefix: "",
  Region: "eu-central-1",
}).catch(() => {
  process.exit(1);
});
