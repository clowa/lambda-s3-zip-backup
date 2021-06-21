import { S3Client, ListObjectsV2CommandInput, ListObjectsV2Command, _Object } from "@aws-sdk/client-s3";

export async function listS3Objects(client: S3Client, config: ListObjectsV2CommandInput, items: _Object[] = []): Promise<_Object[]> {
  console.log(`List objects of ${config.Bucket} with token ${config.ContinuationToken}`);

  const command = new ListObjectsV2Command(config);
  const response = await client.send(command);

  // Filter out folders.
  response.Contents?.forEach((item) => {
    if (!item.Key?.endsWith("/")) items.push(item);
  });

  if (response.IsTruncated) {
    // Call API again with next token and append result objects.
    const newConfig: ListObjectsV2CommandInput = Object.assign(config, { ContinuationToken: response.NextContinuationToken });
    items.concat(await listS3Objects(client, newConfig, items));
  }

  return items;
}
