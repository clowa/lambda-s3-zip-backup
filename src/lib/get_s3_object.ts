import { S3Client, GetObjectCommandInput, GetObjectCommand, _Object } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export async function getS3Objects(client: S3Client, config: GetObjectCommandInput): Promise<Readable> {
  const command = new GetObjectCommand(config);
  const response = await client.send(command);
  const fileStream = response.Body;

  if (!(fileStream instanceof Readable)) {
    throw new Error("Unknown object stream type.");
  }
  return fileStream;
}
