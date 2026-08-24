-- 初期データ投入

-- Adminユーザー（school_id: admin）
INSERT OR IGNORE INTO users (id, school_id, email, password, name, role, created_at)
VALUES ('admin_001', 'admin', 'admin@atnhub.ryopc.org', 'admin123', 'システム管理者', 'admin', datetime('now'));

-- サンプル学校
INSERT OR IGNORE INTO schools (id, name, subdomain, created_at)
VALUES ('school_demo', 'デモ中学校', 'demo', datetime('now'));

-- サンプルユーザー（デモ学校）
INSERT OR IGNORE INTO users (id, school_id, login_id, password, name, role, created_at)
VALUES 
  ('teacher_001', 'school_demo', 'teacher01', 'pass123', '田中先生', 'teacher', datetime('now')),
  ('student_001', 'school_demo', 'student01', 'pass123', '佐藤太郎', 'student', datetime('now')),
  ('student_002', 'school_demo', 'student02', 'pass123', '鈴木花子', 'student', datetime('now')),
  ('student_003', 'school_demo', 'student03', 'pass123', '山田次郎', 'student', datetime('now'));

-- サンプルチャットルーム
INSERT OR IGNORE INTO chat_rooms (id, school_id, name, type, created_by, created_at)
VALUES 
  ('room_class_1', 'school_demo', '1年A組', 'class', 'teacher_001', datetime('now')),
  ('room_grade_1', 'school_demo', '1年生', 'grade', 'teacher_001', datetime('now')),
  ('room_staff', 'school_demo', '職員室', 'staff', 'teacher_001', datetime('now'));

-- チャットルームメンバー
INSERT OR IGNORE INTO chat_room_members (room_id, user_id, joined_at)
VALUES 
  ('room_class_1', 'teacher_001', datetime('now')),
  ('room_class_1', 'student_001', datetime('now')),
  ('room_class_1', 'student_002', datetime('now')),
  ('room_class_1', 'student_003', datetime('now')),
  ('room_grade_1', 'teacher_001', datetime('now')),
  ('room_grade_1', 'student_001', datetime('now')),
  ('room_grade_1', 'student_002', datetime('now')),
  ('room_grade_1', 'student_003', datetime('now')),
  ('room_staff', 'teacher_001', datetime('now'));

-- サンプルメッセージ
INSERT OR IGNORE INTO messages (id, room_id, user_id, content, created_at)
VALUES 
  ('msg_001', 'room_class_1', 'teacher_001', 'おはようございます！今日からこのチャットルームを使います。', datetime('now', '-2 hours')),
  ('msg_002', 'room_class_1', 'student_001', 'おはようございます！よろしくお願いします。', datetime('now', '-1 hour 50 minutes')),
  ('msg_003', 'room_class_1', 'student_002', 'よろしくお願いします！', datetime('now', '-1 hour 45 minutes'));

-- サンプル出席記録
INSERT OR IGNORE INTO attendance (id, school_id, user_id, date, status, note, created_at, updated_at)
VALUES 
  ('att_001', 'school_demo', 'student_001', date('now'), 'present', '', datetime('now'), datetime('now')),
  ('att_002', 'school_demo', 'student_002', date('now'), 'present', '', datetime('now'), datetime('now')),
  ('att_003', 'school_demo', 'student_003', date('now'), 'late', '電車遅延', datetime('now'), datetime('now'));
