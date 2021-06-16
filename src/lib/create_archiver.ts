import archiver, { ArchiverOptions } from "archiver";
import fs from "fs";

export function createArchiver(output: fs.WriteStream, options?: ArchiverOptions): archiver.Archiver {
  const archive = archiver("zip", options);

  if (output) {
    archive.pipe(output);

    // Listen for all archive data to be written.
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", () => {
      console.log(archive.pointer() + " total bytes");
      console.log("Archiver has been finalized and the output file descriptor has closed.");
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // Is is not part of this library but rather from the NodeJS Stream API.
    // See: https://nodejs.org/api/stream.html#stream_event_end
    output.on("end", () => {
      console.log("Data has been drained.");
    });
  }

  // Good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on("warning", (err: NodeJS.ErrnoException) => {
    console.log("This shouldn't happen!");
    if (err.code === "ENOENT") {
      console.log(err.message);
    } else {
      throw err;
    }
  });

  // Good practice to catch this error explicitly.
  archive.on("error", (err: NodeJS.ErrnoException) => {
    console.log("Something went terrible wrong!");
    throw err;
  });

  return archive;
}
