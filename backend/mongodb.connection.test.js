import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
describe("MongoDB Connection", () => {
    it("should successfully connect to MongoDB", async () => {
        const uri = process.env.MONGODB_URI;
        expect(uri).toBeDefined();
        if (uri) {
            await mongoose.connect(uri);
            expect(mongoose.connection.readyState).toBe(1); // 1 = connected
            await mongoose.connection.close();
        }
    }, 15000); // 15 second timeout for connection
});
