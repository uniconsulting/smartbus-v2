import assert from "node:assert/strict";
import test from "node:test";
import { maxDiagnosticMessage } from "../lib/max-diagnostics.ts";

test("MAX checks distinguish DNS, timeout, TLS and transport errors from a rejected token", () => {
  const cases = [
    [["ENOTFOUND", "EAI_AGAIN"], /DNS/],
    [["ABORT_ERR", "ETIMEDOUT"], /Время ожидания/],
    [["ERR_TLS_CERT_ALTNAME_INVALID", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "SELF_SIGNED_CERT_IN_CHAIN"], /TLS/],
    [["EPIPE", "ECONNRESET", "ERR_STREAM_PREMATURE_CLOSE"], /прервалось/],
    [["ENETUNREACH", "ECONNREFUSED", "EHOSTUNREACH"], /порт.*443/],
  ];
  for (const [codes, expected] of cases) {
    for (const code of codes) {
      const diagnostic = maxDiagnosticMessage(Object.assign(new Error("private-detail"), { code }));
      assert.match(diagnostic, expected, code);
      assert.doesNotMatch(diagnostic, /токен|команд|private-detail/i);
    }
  }
  assert.match(maxDiagnosticMessage(new Error("MAX_AUTH")), /отклонил токен/);
  assert.match(maxDiagnosticMessage(new Error("MAX_INTERFACE_UNAVAILABLE")), /SMARTBUS_MAX_INTERFACE/);
  assert.match(maxDiagnosticMessage(new Error("MAX_UNAVAILABLE")), /API MAX вернул ошибку/);
  assert.match(maxDiagnosticMessage(new Error("MAX_INVALID_RESPONSE")), /обработать ответ/);
  assert.doesNotMatch(maxDiagnosticMessage(new Error("private-detail")), /private-detail/);
});
