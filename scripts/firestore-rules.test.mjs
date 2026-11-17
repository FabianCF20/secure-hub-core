import { readFile } from "node:fs/promises";
import { before, after, beforeEach, describe, it } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-ainca";
const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
let testEnv;

const users = [
  ["admin-1", "ADMIN", ["client-a"]],
  ["central-1", "CENTRAL", ["client-a"]],
  ["analyst-1", "ANALISTA", ["client-a"]],
  ["supervisor-1", "SUPERVISOR", ["client-a"]],
  ["coordinator-1", "COORDINADOR", ["client-a"]],
  ["guard-1", "GUARDA", ["client-a"]],
  ["guard-2", "GUARDA", ["client-a"]],
  ["client-1", "CLIENTE", ["client-a"]],
  ["inactive-analyst", "ANALISTA", ["client-a"]],
];

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, role, clientIds] of users) {
      await setDoc(doc(db, "users", uid), {
        fullName: uid,
        role,
        clientIds,
        isActive: uid !== "inactive-analyst",
      });
    }

    await setDoc(doc(db, "clients", "client-a"), { name: "Cliente A" });
    await setDoc(doc(db, "clients", "client-b"), { name: "Cliente B" });
    await setDoc(doc(db, "records", "record-guard-1"), {
      userId: "guard-1",
      clientId: "client-a",
      status: "SENT",
    });
    await setDoc(doc(db, "records", "record-guard-2"), {
      userId: "guard-2",
      clientId: "client-a",
      status: "SENT",
    });
    await setDoc(doc(db, "records", "record-client-b"), {
      userId: "guard-2",
      clientId: "client-b",
      status: "SENT",
    });
    await setDoc(doc(db, "intelligenceCases", "case-1"), {
      caseNumber: "INT-000001",
      status: "OPEN",
    });
    await setDoc(doc(db, "intelligenceReports", "report-guard-1"), {
      createdBy: "guard-1",
      clientId: "client-a",
    });
    await setDoc(doc(db, "intelligenceReports", "report-guard-2"), {
      createdBy: "guard-2",
      clientId: "client-a",
    });
    await setDoc(doc(db, "auditLogs", "log-1"), { action: "record_created" });
  });
}

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080, rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedData();
});

after(async () => {
  await testEnv?.cleanup();
});

describe("Firestore role and tenant access", () => {
  it("allows field staff to read only their own records", async () => {
    const db = dbFor("guard-1");
    await assertSucceeds(getDoc(doc(db, "records", "record-guard-1")));
    await assertFails(getDoc(doc(db, "records", "record-guard-2")));
  });

  it("keeps client users inside their assigned client", async () => {
    const db = dbFor("client-1");
    await assertSucceeds(getDoc(doc(db, "records", "record-guard-1")));
    await assertFails(getDoc(doc(db, "records", "record-client-b")));
    await assertFails(getDoc(doc(db, "clients", "client-b")));
  });

  it("allows only authorized intelligence reviewers to read cases", async () => {
    await assertSucceeds(getDoc(doc(dbFor("admin-1"), "intelligenceCases", "case-1")));
    await assertSucceeds(getDoc(doc(dbFor("central-1"), "intelligenceCases", "case-1")));
    await assertSucceeds(getDoc(doc(dbFor("analyst-1"), "intelligenceCases", "case-1")));
    await assertFails(getDoc(doc(dbFor("guard-1"), "intelligenceCases", "case-1")));
    await assertFails(getDoc(doc(dbFor("inactive-analyst"), "intelligenceCases", "case-1")));
  });

  it("allows field staff to read only the intelligence reports they created", async () => {
    const db = dbFor("guard-1");
    await assertSucceeds(getDoc(doc(db, "intelligenceReports", "report-guard-1")));
    await assertFails(getDoc(doc(db, "intelligenceReports", "report-guard-2")));
    await assertSucceeds(
      getDoc(doc(dbFor("analyst-1"), "intelligenceReports", "report-guard-2")),
    );
  });

  it("restricts audit logs to active ADMIN and CENTRAL users", async () => {
    await assertSucceeds(getDoc(doc(dbFor("admin-1"), "auditLogs", "log-1")));
    await assertSucceeds(getDoc(doc(dbFor("central-1"), "auditLogs", "log-1")));
    await assertFails(getDoc(doc(dbFor("analyst-1"), "auditLogs", "log-1")));
    await assertFails(getDoc(doc(dbFor("guard-1"), "auditLogs", "log-1")));
  });

  it("blocks direct client creation and modification of records", async () => {
    const db = dbFor("guard-1");
    await assertFails(
      setDoc(doc(db, "records", "forged-record"), {
        userId: "guard-1",
        clientId: "client-a",
      }),
    );
    await assertFails(
      updateDoc(doc(db, "records", "record-guard-1"), { status: "APPROVED" }),
    );
  });

  it("accepts a minute entry only when its author matches the signed-in profile", async () => {
    const db = dbFor("guard-1");
    await assertSucceeds(
      setDoc(doc(db, "minuteEntries", "valid-entry"), {
        clientId: "client-a",
        userId: "guard-1",
        userName: "guard-1",
        userRole: "GUARDA",
        type: "novedad",
        content: "Registro de prueba",
        createdAt: "2026-11-17T10:00:00.000Z",
        isClosed: false,
      }),
    );
    await assertFails(
      setDoc(doc(db, "minuteEntries", "forged-entry"), {
        clientId: "client-a",
        userId: "guard-2",
        userName: "guard-2",
        userRole: "GUARDA",
        type: "novedad",
        content: "Intento de suplantación",
        createdAt: "2026-11-17T10:00:00.000Z",
        isClosed: false,
      }),
    );
  });
});
