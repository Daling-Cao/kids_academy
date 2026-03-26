import { useState, useEffect } from 'react';

const translations = {
  zh: {
    // General
    loading: '载入中...',
    error: '发生错误:',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    logout: '退出',
    noData: '暂无数据',
    
    // Login
    loginTitle: 'Kids Academy 登录',
    username: '用户名',
    password: '密码',
    role: '角色',
    student: '学生',
    teacher: '老师',
    loginBtn: '登录',
    loginFailed: '登录失败，请检查凭据。',
    
    // Student Dashboard
    campus: '校园',
    welcomeBack: '欢迎回来',
    myCoins: '我的区块币',
    messages: '消息',
    noBuildings: '目前还没有解锁的建筑。',
    
    // Hallway (BuildingView)
    backToCampus: '返回校园',
    lockedClassroom: '这间教室被锁定了！请先完成前面的课程。',
    noClassrooms: '目前这栋建筑里还没有教室。',
    notFoundBuilding: '找不到该建筑。',
    
    // Classroom
    backToHallway: '返回大厅',
    projectFiles: '项目文件',
    downloadStarter: '下载初始项目开始编程。',
    downloadSb3: '下载 .sb3',
    lockedByTeacher: '(老师已锁定)',
    knowledgeCheck: '知识问答',
    multipleAnswers: '多选题',
    checkAnswers: '检查答案',
    completeSegment: '完成此部分',
    segmentCompleted: '部分已完成',
    overallProgress: '整体课程进度',
    markCompleted: '将课程标记为完成',
    fullyCompleted: '课程已完全完成!',
    completeAllSegments: '完成所有部分以将课程标记为完成。',
    earnedCoin: '+1 区块币!',
    awesomeJob: '太棒了！你应得的！',
    classroomNotFound: '找不到教室。',
    noSegments: '这节课还没有内容。',
    
    // Teacher Tabs Header
    teacherDashboard: '教师控制台',
    tabBuildings: '建筑管理',
    tabProjects: '项目管理',
    tabStudents: '学生管理',
    tabRewards: '奖励系统',
    tabMessages: '消息中心',
    
    // Teacher - Buildings
    buildingName: '建筑名称',
    buildingDesc: '建筑描述',
    coverImage: '封面图片 (URL)',
    addBuilding: '添加建筑',
    saveBuilding: '保存建筑',
    
    // Teacher - Projects
    addProject: '添加项目',
    projectTitle: '项目标题',
    projectDesc: '项目描述',
    projectList: '项目列表',
    order: '序号',
    building: '建筑',
    title: '标题',
    status: '状态',
    actions: '操作',
    locked: '已锁定',
    published: '已发布',
    unlockProject: '解锁项目',
    lockProject: '锁定项目',
    editProject: '编辑项目',
    deleteProject: '删除项目',
    
    // Teacher - Students
    addStudent: '注册学生',
    studentName: '学生姓名',
    studentPass: '密码',
    studentList: '学生列表',
    manageStudent: '管理:',
    buildingVisibility: '建筑可见性',
    projectProgress: '项目进度',
    currentBalance: '当前余额',
    adjustCoins: '手动调整币数',
    noStudentsYet: '暂无学生。',
    selectStudentToManage: '从列表中选择要管理的学生。',
    inProgress: '进行中',
    completed: '已完成',
    unlocked: '已解锁',
    
    // Teacher - Rewards
    addRank: '添加段位',
    rankName: '段位名称',
    rankIcon: '段位图标',
    rankThreshold: '所需区块币',
    noRewards: '暂无段位',
    
    // Teacher - Messages
    sendMessage: '发送消息',
    messageContent: '消息内容',
    reply: '回复',
    sendReply: '发送回复',
    studentMessages: '学生消息',
    newMessages: '新',
    markAllRead: '标为全部已读',
    noMessagesYet: '暂无消息',
    studentsCanSendMessages: '学生可以在控制台向您发送消息。',
    yourReply: '您的回复',
    editReply: '编辑回复',
    writeReply: '写您的回复...',
    sending: '发送中...',
    markAsRead: '标为已读',
  },
  de: {
    // General
    loading: 'Wird geladen...',
    error: 'Fehler:',
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    add: 'Hinzufügen',
    logout: 'Abmelden',
    noData: 'Keine Daten vofhanden',
    
    // Login
    loginTitle: 'Kids Academy Login',
    username: 'Benutzername',
    password: 'Passwort',
    role: 'Rolle',
    student: 'Schüler',
    teacher: 'Lehrer',
    loginBtn: 'Einloggen',
    loginFailed: 'Ungültige Anmeldedaten.',
    
    // Student Dashboard
    campus: 'Campus',
    welcomeBack: 'Willkommen zurück',
    myCoins: 'Meine BlockCoins',
    messages: 'Nachrichten',
    noBuildings: 'Noch keine Gebäude freigeschaltet.',
    
    // Hallway (BuildingView)
    backToCampus: 'Zurück zum Campus',
    lockedClassroom: 'Dieses Klassenzimmer ist gesperrt! Beende zuerst das vorherige.',
    noClassrooms: 'Noch keine Klassenzimmer in diesem Gebäude.',
    notFoundBuilding: 'Gebäude nicht gefunden.',
    
    // Classroom
    backToHallway: 'Zurück zur Halle',
    projectFiles: 'Projektdateien',
    downloadStarter: 'Lade das Startprojekt herunter, um mit dem Programmieren zu beginnen.',
    downloadSb3: 'Herunterladen .sb3',
    lockedByTeacher: '(Vom Lehrer gesperrt)',
    knowledgeCheck: 'Wissensüberprüfung',
    multipleAnswers: 'Mehrere Antworten',
    checkAnswers: 'Antworten prüfen',
    completeSegment: 'Diesen Abschnitt abschließen',
    segmentCompleted: 'Abschnitt abgeschlossen',
    overallProgress: 'Gesamter Lernfortschritt',
    markCompleted: 'Lektion als abgeschlossen markieren',
    fullyCompleted: 'Lektion vollständig abgeschlossen!',
    completeAllSegments: 'Schließe alle Abschnitte ab, um die Lektion als abgeschlossen zu markieren.',
    earnedCoin: '+1 BlockCoin!',
    awesomeJob: 'Tolle Arbeit! Du hast es dir verdient!',
    classroomNotFound: 'Klassenzimmer nicht gefunden.',
    noSegments: 'Noch keine Abschnitte verfügbar.',
    
    // Teacher Tabs Header
    teacherDashboard: 'Lehrer-Dashboard',
    tabBuildings: 'Gebäude',
    tabProjects: 'Projekte',
    tabStudents: 'Schüler',
    tabRewards: 'Belohnungen',
    tabMessages: 'Nachrichten',
    
    // Teacher - Buildings
    buildingName: 'Gebäudename',
    buildingDesc: 'Gebäudebeschreibung',
    coverImage: 'Titelbild (URL)',
    addBuilding: 'Gebäude hinzufügen',
    saveBuilding: 'Gebäude speichern',
    
    // Teacher - Projects
    addProject: 'Projekt hinzufügen',
    projectTitle: 'Projekttitel',
    projectDesc: 'Projektbeschreibung',
    projectList: 'Projektliste',
    order: 'Reihenfolge',
    building: 'Gebäude',
    title: 'Titel',
    status: 'Status',
    actions: 'Aktionen',
    locked: 'Gesperrt',
    published: 'Veröffentlicht',
    unlockProject: 'Projekt entsperren',
    lockProject: 'Projekt sperren',
    editProject: 'Projekt bearbeiten',
    deleteProject: 'Projekt löschen',
    
    // Teacher - Students
    addStudent: 'Schüler registrieren',
    studentName: 'Schülername',
    studentPass: 'Passwort',
    studentList: 'Schülerliste',
    manageStudent: 'Verwalten:',
    buildingVisibility: 'Gebäudesichtbarkeit',
    projectProgress: 'Projektfortschritt',
    currentBalance: 'Aktueller Saldo',
    adjustCoins: 'Münzen manuell anpassen',
    noStudentsYet: 'Noch keine Schüler.',
    selectStudentToManage: 'Wähle einen Schüler aus der Liste zum Verwalten aus.',
    inProgress: 'In Bearbeitung',
    completed: 'Abgeschlossen',
    unlocked: 'Entsperrt',
    
    // Teacher - Rewards
    addRank: 'Rang hinzufügen',
    rankName: 'Rangname',
    rankIcon: 'Rang-Symbol',
    rankThreshold: 'Erforderliche BlockCoins',
    noRewards: 'Keine Ränge gefunden.',
    
    // Teacher - Messages
    sendMessage: 'Nachricht senden',
    messageContent: 'Nachrichteninhalt',
    reply: 'Antworten',
    sendReply: 'Antwort senden',
    studentMessages: 'Schülernachrichten',
    newMessages: 'neu',
    markAllRead: 'Alle als gelesen markieren',
    noMessagesYet: 'Noch keine Nachrichten',
    studentsCanSendMessages: 'Schüler können dir von ihrem Dashboard aus Nachrichten senden.',
    yourReply: 'Deine Antwort',
    editReply: 'Antwort bearbeiten',
    writeReply: 'Schreibe deine Antwort...',
    sending: 'Wird gesendet...',
    markAsRead: 'Als gelesen markieren',
  }
};

export function useI18n() {
  const lang = navigator.language.toLowerCase().startsWith('de') ? 'de' : 'zh';
  return { t: translations[lang], lang };
}
