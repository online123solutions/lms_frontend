import React, { useRef, useState } from "react";
import { downloadStudentsTemplate, uploadStudentsExcel } from "../../api/apiservice";

const AdminUserImportCard = () => {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handlePick = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setResultMsg("");
    setErrorMsg("");
    if (!f) {
      setFileName("");
      return;
    }
    // Basic validation
    const valid =
      f.type.includes("sheet") ||
      f.name.endsWith(".xlsx") ||
      f.name.endsWith(".xls") ||
      f.name.endsWith(".csv");
    if (!valid) {
      setErrorMsg("Please select a valid Excel/CSV file (.xlsx, .xls, .csv).");
      e.target.value = "";
      setFileName("");
      return;
    }
    setFileName(f.name);
  };

  const handleDownloadTemplate = async () => {
    setErrorMsg("");
    setResultMsg("");
    const { success, error } = await downloadStudentsTemplate();
    if (!success) {
      setErrorMsg(
        typeof error === "string"
          ? error
          : "Failed to download template. Please try again."
      );
    } else {
      setResultMsg("Template downloaded.");
    }
  };

  const handleUpload = async () => {
    setErrorMsg("");
    setResultMsg("");
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setErrorMsg("Please choose a file first.");
      return;
    }
    try {
      setIsUploading(true);
      const { success, data, error } = await uploadStudentsExcel(f);
      setIsUploading(false);

      if (!success) {
        setErrorMsg(
          typeof error === "string"
            ? error
            : error?.detail ||
              error?.message ||
              "Upload failed. Please check your file and try again."
        );
        return;
      }

      // You can adapt this to whatever your API returns: counts, errors, etc.
      const summary =
        typeof data === "string"
          ? data
          : data?.summary ||
            `Uploaded successfully${
              data?.created_count != null ? ` • Created: ${data.created_count}` : ""
            }${data?.updated_count != null ? ` • Updated: ${data.updated_count}` : ""}`;

      setResultMsg(summary || "Upload complete.");
      // reset file input (optional)
      fileRef.current.value = "";
      setFileName("");
    } catch (err) {
      setIsUploading(false);
      setErrorMsg("Unexpected error during upload.");
    }
  };

  return (
    <div className="bulk-users-card">
      <div className="bulk-users-header">
        <div>
          <h3>Bulk Users</h3>
          <p className="subtitle">Download template & upload students via Excel</p>
        </div>
        <button className="btn ghost" onClick={handleDownloadTemplate}>
          Download Template
        </button>
      </div>

      <div className="bulk-users-body">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFileChange}
          style={{ display: "none" }}
        />

        <div className="file-row">
          <div className="file-info">
            <div className="file-name">{fileName || "No file chosen"}</div>
            <div className="file-hint">Accepted: .xlsx, .xls, .csv</div>
          </div>
          <div className="file-actions">
            <button className="btn secondary" onClick={handlePick}>Choose File</button>
            <button
              className="btn primary"
              disabled={isUploading || !fileName}
              onClick={handleUpload}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        {resultMsg ? <div className="alert success">{resultMsg}</div> : null}
        {errorMsg ? <div className="alert danger">{errorMsg}</div> : null}
      </div>

      <style>{`
        .bulk-users-card{
          background:#fff;border:1px solid #e5e7eb;border-radius:16px;
          padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.04)
        }
        .bulk-users-header{
          display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px
        }
        .bulk-users-header h3{margin:0;font-size:18px}
        .subtitle{margin:4px 0 0;color:#6b7280;font-size:13px}
        .bulk-users-body{display:flex;flex-direction:column;gap:12px}
        .file-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .file-info{min-width:200px}
        .file-name{font-weight:600}
        .file-hint{font-size:12px;color:#6b7280}
        .file-actions{display:flex;gap:8px}
        .btn{border:none;border-radius:12px;padding:10px 14px;cursor:pointer;font-weight:600}
        .btn.primary{background:#0ea5e9;color:#fff}
        .btn.secondary{background:#f3f4f6}
        .btn.ghost{background:transparent;border:1px solid #e5e7eb}
        .btn:disabled{opacity:0.6;cursor:not-allowed}
        .alert{padding:10px 12px;border-radius:10px;font-size:14px}
        .alert.success{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
        .alert.danger{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}

        @media (max-height: 768px) {
          .bulk-users-card {
            padding: 12px;
          }
          .bulk-users-header h3 {
            font-size: 16px;
          }
          .subtitle {
            font-size: 12px;
          }
          .bulk-users-body {
            gap: 10px;
          }
          .file-row {
            gap: 10px;
          }
          .btn {
            padding: 8px 12px;
            font-size: 13px;
          }
          .alert {
            padding: 8px 10px;
            font-size: 13px;
          }
        }

        @media (max-height: 552px) {
          .bulk-users-card {
            padding: 10px;
          }
          .bulk-users-header {
            margin-bottom: 10px;
            gap: 10px;
          }
          .bulk-users-header h3 {
            font-size: 15px;
          }
          .subtitle {
            font-size: 11px;
            margin-top: 2px;
          }
          .bulk-users-body {
            gap: 8px;
          }
          .file-row {
            gap: 8px;
          }
          .file-info {
            min-width: 180px;
          }
          .file-name {
            font-size: 14px;
          }
          .file-hint {
            font-size: 11px;
          }
          .btn {
            padding: 6px 10px;
            font-size: 12px;
          }
          .alert {
            padding: 6px 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminUserImportCard;
