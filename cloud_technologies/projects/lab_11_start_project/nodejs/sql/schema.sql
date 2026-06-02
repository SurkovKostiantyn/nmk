CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    group_name VARCHAR(50),
    enrollment_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO students (name, email, group_name) VALUES
    ('Іван Петренко', 'ivan.petrenko@example.com', 'КН-41'),
    ('Марія Коваленко', 'maria.kovalenko@example.com', 'КН-41');
