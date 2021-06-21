import { ArchiveToBucket } from "./lib/archive_to_bucket";

ArchiveToBucket(
  {
    Bucket: "my-bucket",
    Prefix: "",
    Region: "eu-central-1",
  },
  {
    Bucket: "backup-bucket",
    Key: "backup/backup.zip",
    Region: "eu-west-1",
  }
);
