import { S3Client, ListObjectsV2CommandInput, GetObjectCommandInput, CreateMultipartUploadCommandInput } from "@aws-sdk/client-s3";
import { listS3Objects } from "./list_s3_objects";
import fs from "fs";
import path from "path";
import os from "os";
import { getS3Objects } from "./get_s3_object";
import { createArchiver } from "./create_archiver";
import { uploadMultiPartFromStream } from "./upload_multipart_from_stream";
import { Cleanup } from "./cleanup";

export interface SourceBucketInfo {
  Bucket: string;
  Prefix: string;
  Region: string;
}

export interface DestBucketInfo {
  Bucket: string;
  Key: string;
  Region: string;
}

export async function ArchiveToBucket(SourceBucket: SourceBucketInfo, DestBucket?: DestBucketInfo): Promise<void> {
  const filename = "tmpS3.zip";

  process.on("SIGINT", async () => {
    console.log("Caught interrupt signal ...");
    await Cleanup([tmpdir]);
    process.exit(1);
  });

  // Set DestBucket to SourceBucket if omitted.
  if (!DestBucket) {
    console.log("Set destination Bucket equal to source Bucket.");
    DestBucket = {
      Bucket: SourceBucket.Bucket,
      Region: SourceBucket.Region,
      Key: SourceBucket.Prefix + filename,
    };
  }

  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-"));
  console.log(`Created tmp dir: ${tmpdir}`);

  const filePath = path.join(tmpdir, filename);
  console.log(`Output file: ${filePath}`);

  const coreCount = os.cpus().length;
  const output = fs.createWriteStream(filePath);
  const archive = createArchiver(output, {
    zlib: { level: 9 }, // set compression lvl
    statConcurrency: coreCount,
  });

  const sourceBucketClient = new S3Client({
    region: SourceBucket.Region,
  });

  const listConfig: ListObjectsV2CommandInput = {
    Bucket: SourceBucket.Bucket,
    Prefix: SourceBucket.Prefix,
  };

  try {
    const items = await listS3Objects(sourceBucketClient, listConfig);

    for (const s3Obj of items) {
      const config: GetObjectCommandInput = {
        Bucket: listConfig.Bucket,
        ExpectedBucketOwner: s3Obj.Owner?.ID,
        Key: s3Obj.Key,
        IfUnmodifiedSince: s3Obj.LastModified,
      };
      const readStream = await getS3Objects(sourceBucketClient, config);
      archive.append(readStream, { name: s3Obj.Key! });
    }

    // Finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand.
    await archive.finalize();

    const destinationBucketClient = new S3Client({
      region: DestBucket.Region,
    });

    const source = fs.createReadStream(filePath);

    const config: CreateMultipartUploadCommandInput = {
      Bucket: DestBucket.Bucket,
      Key: DestBucket.Key,
    };

    await uploadMultiPartFromStream(destinationBucketClient, source, config);
    console.log("FINISHED!!!");
  } catch (err) {
    console.log(err.message);
  } finally {
    Cleanup([tmpdir]);
  }
}
