# PUSHREGEL - GitHub Automation

## Permanente Automatisierung

Diese PUSHREGEL ist IMMER aktiv und wird bei JEDEM Task automatisch ausgeführt.

**Aktivierung**: Sage "pushe nach pushregel" und der Push wird automatisch durchgeführt!

## 1. Automatischer Push bei jeder Änderung

**Regel**: Nach JEDEM Task, der Code-Änderungen enthält, wird automatisch zu GitHub gepusht.

**Workflow**:
1. Änderungen werden vorgenommen
2. `git add -A`
3. `git commit -m "Beschreibende Commit-Message"`
4. `git push origin main`

**Ausnahmen**: Keine. IMMER pushen!

## 2. Token-Management

**Token-Speicherort**: `.github-token`
**Token wird automatisch verwendet**

## 3. GitHub-Konfiguration

**Config**: `.bolt/github-config.json`
**Repository**: https://github.com/justinrudat94-hash/-jetzzaktuell-website.git

## Status

✅ GitHub-Automation AKTIV
✅ Auto-Push EINGESCHALTET
✅ Token gespeichert
✅ Bereit für automatische Deployments
