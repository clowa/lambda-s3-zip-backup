import { S3Client, GetObjectCommandInput, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export async function getS3Objects(client: S3Client, config: GetObjectCommandInput): Promise<Readable> {
  console.log(`Get object: ${config.Key}`);
  const command = new GetObjectCommand(config);
  const response = await client.send(command);
  console.log(
    `Got object: \n\tKey:\t\t${config.Key}\n\tLength:\t\t${response.ContentLength} Bytes\n\tEncryption:\t${response.ServerSideEncryption}\n`
  );
  const fileStream = response.Body;

  if (!(fileStream instanceof Readable)) {
    throw new Error("Unknown object stream type.");
  }
  return fileStream;
}
