import mongoose from "mongoose";
import { Readable } from "stream";
import { connectDB } from "../models.js";

const BUCKET_NAME = "uploads";

const getBucket = async () => {
    await connectDB();
    if (!mongoose.connection?.db) {
        throw new Error("MongoDB connection is not ready");
    }
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
};

const toObjectId = (id) => {
    if (!id) {
        return null;
    }
    return new mongoose.Types.ObjectId(id);
};
  
export async function saveBufferToGridFS({ buffer, filename, mimeType, metadata }) {
    const bucket = await getBucket();
    return await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename || "file", {
            contentType: mimeType,
            metadata,
        });
        Readable.from(buffer)
            .pipe(uploadStream)
            .on("error", reject)
            .on("finish", () => {
                resolve({
                    fileId: uploadStream.id.toString(),
                    filename: uploadStream.filename,
                });
            });
    });
}

export async function getGridFSFileInfo(id) {
    const bucket = await getBucket();
    const objectId = toObjectId(id);
    if (!objectId) {
        return null;
    }
    const files = await bucket.find({ _id: objectId }).toArray();
    return files?.[0] || null;
}

export async function getGridFSFileBuffer(id) {
    const bucket = await getBucket();
    const objectId = toObjectId(id);
    if (!objectId) {
        return null;
    }
    return await new Promise((resolve, reject) => {
        const chunks = [];
        bucket
            .openDownloadStream(objectId)
            .on("data", (chunk) => chunks.push(chunk))
            .on("error", reject)
            .on("end", () => resolve(Buffer.concat(chunks)));
    });
}

export async function streamGridFSFile(id, res) {
    const bucket = await getBucket();
    const objectId = toObjectId(id);
    if (!objectId) {
        return false;
    }
    const file = await getGridFSFileInfo(id);
    if (!file) {
        return false;
    }
    res.setHeader("Content-Type", file.contentType || "application/octet-stream");
    res.setHeader(
        "Content-Disposition",
        `inline; filename="${file.filename || "file"}"`,
    );
    bucket.openDownloadStream(objectId).pipe(res);
    return true;
}

export async function deleteGridFSFile(id) {
    const bucket = await getBucket();
    const objectId = toObjectId(id);
    if (!objectId) {
        return;
    }
    await bucket.delete(objectId);
}
