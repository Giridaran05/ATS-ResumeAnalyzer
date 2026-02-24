import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [role, setRole] = useState("");
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  /* ---------------- LOAD HISTORY ---------------- */

  useEffect(() => {
    fetch("http://localhost:5000/history")
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(() => {});
  }, [result]); // refresh after analysis

  /* ---------------- FILE HANDLING ---------------- */

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only PDF & DOCX files are allowed");
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  /* ---------------- ANALYZE ---------------- */

  const analyzeResume = async () => {
    if (!file) return alert("Upload resume first");
    if (!role) return alert("Enter job role");

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("role", role);

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 800);

    } catch (err) {
      setLoading(false);
      alert("Backend server not running");
    }
  };

  /* ---------------- EXPORT PDF ---------------- */

  const exportReport = async () => {
    if (!result) return;

    const res = await fetch("http://localhost:5000/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
      }),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url);
  };

  /* ---------------- RESET ---------------- */

  const resetAll = () => {
    setFile(null);
    setRole("");
    setResult(null);
  };

  return (
    <div className="app">
      <div className="card">
        <h2>🚀 AI Resume Analyzer</h2>

        <div
          className={`drop-zone ${dragActive ? "active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {file ? (
            <>
              <p className="file-name">📄 {file.name}</p>
              <span className="change-text">Click to change file</span>
            </>
          ) : (
            "Drag & Drop Resume or Click to Upload"
          )}

          <input
            id="fileInput"
            type="file"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        <input
          type="text"
          placeholder="Enter Job Role (e.g. Frontend Developer)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />

        <button onClick={analyzeResume} disabled={loading}>
          {loading ? "Analyzing Resume..." : "Analyze Resume"}
        </button>

        {loading && <div className="loader"></div>}

        {result && (
          <div className="result">
            <h3>Match Score: {result.score}%</h3>

            <div>
              <strong>✅ Matched Skills</strong>
              <div className="skills">
                {result.matchedSkills.length ? (
                  result.matchedSkills.map((skill, i) => (
                    <span key={i}>{skill}</span>
                  ))
                ) : (
                  <p>No matching skills</p>
                )}
              </div>
            </div>

            <div>
              <strong>❌ Missing Skills</strong>
              <div className="skills missing">
                {result.missingSkills.map((skill, i) => (
                  <span key={i}>{skill}</span>
                ))}
              </div>
            </div>

            <button onClick={exportReport}>
              Export PDF Report
            </button>

            <button className="reset-btn" onClick={resetAll}>
              Analyze Another Resume
            </button>
          </div>
        )}

        {/* ---------------- HISTORY PANEL ---------------- */}

        <div className="history">
          <h3>📜 Upload History</h3>
          {history.length ? (
            history.map((item, i) => (
              <div key={i} className="history-item">
                <p><strong>{item.fileName}</strong></p>
                <p>{item.role} — {item.score}%</p>
              </div>
            ))
          ) : (
            <p>No history yet</p>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;