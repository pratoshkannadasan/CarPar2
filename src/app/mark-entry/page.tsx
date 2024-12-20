'use client';

import { useState } from 'react';
import { Table, Input, Card, Typography, Button, Space, message, Tooltip, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, SaveOutlined, FileExcelOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

const { Title } = Typography;

interface StudentMarks {
  key: string;
  no: number;
  name: string;
  quiz1: number;
  quiz2: number;
  quiz3: number;
  assignment1: number;
  assignment2: number;
  assignment3: number;
  test1: number;
  test2: number;
  test3: number;
  carryMarks: number;
  final1: number;
  final2: number;
  final3: number;
  total: number;
  overallTotal: number;
  grade: string;
}

interface CLOPLOMapping {
  quiz: number[];
  assignment: number[];
  test: number[];
  final: number[];
}

interface CourseInfo {
  programName: string;
  courseName: string;
  courseCode: string;
  lecturerName: string;
  semester: string;
  academicSession: string;
}

const calculateGrade = (total: number): string => {
  if (total >= 89.5) return 'A+';  // 89.5 - 100  | EXCELLENT
  if (total >= 79.5) return 'A';   // 79.5 - 89.4 | EXCELLENT
  if (total >= 74.5) return 'A-';  // 74.5 - 79.4 | PASS
  if (total >= 69.5) return 'B+';  // 69.5 - 74.4 | PASS
  if (total >= 64.5) return 'B';   // 64.5 - 69.4 | PASS
  if (total >= 59.5) return 'B-';  // 59.5 - 64.4 | PASS
  if (total >= 54.5) return 'C+';  // 54.5 - 59.4 | PASS
  if (total >= 49.5) return 'C';   // 49.5 - 54.4 | PASS
  if (total >= 44.5) return 'C-';  // 44.5 - 49.4 | PASS
  if (total >= 39.5) return 'D+';  // 39.5 - 44.4 | MINIMUM PASS
  if (total >= 34.5) return 'D';   // 34.5 - 39.4 | FAIL
  if (total >= 29.5) return 'D-';  // 29.5 - 34.4 | FAIL
  return 'E';                      // 0 - 29.4    | FAIL
};

const getGradeColor = (grade: string): string => {
    switch(grade) {
      case 'A+':
      case 'A':
        return '#4CAF50'; // Green for EXCELLENT
      case 'A-':
      case 'B+':
      case 'B':
      case 'B-':
      case 'C+':
      case 'C':
      case 'C-':
        return '#2196F3'; // Blue for PASS
      case 'D+':
        return '#FFC107'; // Yellow for MINIMUM PASS
      case 'D':
      case 'D-':
      case 'E':
        return '#F44336'; // Red for FAIL
      default:
        return '#F44336'; // Red for any other case
    }
  };


export default function Markentry() {  
  const [data, setData] = useState<StudentMarks[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  
  const [cloNumbers, setCloNumbers] = useState<CLOPLOMapping>({
    quiz: [1, 2, 3],
    assignment: [1, 2, 3],
    test: [1, 2, 3],
    final: [1, 2, 3]
  });
  
  const [ploNumbers, setPloNumbers] = useState<CLOPLOMapping>({
    quiz: [6, 6, 7],
    assignment: [6, 6, 7],
    test: [6, 6, 7],
    final: [6, 6, 7]
  });

  const [courseInfo, setCourseInfo] = useState<CourseInfo>({
    programName: '',
    courseName: '',
    courseCode: '',
    lecturerName: '',
    semester: '',
    academicSession: ''
  });

  const handleCourseInfoChange = (field: keyof CourseInfo, value: string) => {
    setCourseInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCLOChange = (assessmentType: keyof CLOPLOMapping, index: number, value: string) => {
    const newValue = parseInt(value) || 0;
    setCloNumbers(prev => ({
      ...prev,
      [assessmentType]: prev[assessmentType].map((num, i) => i === index ? newValue : num)
    }));
  };

  const handlePLOChange = (assessmentType: keyof CLOPLOMapping, index: number, value: string) => {
    const newValue = parseInt(value) || 0;
    setPloNumbers(prev => ({
      ...prev,
      [assessmentType]: prev[assessmentType].map((num, i) => i === index ? newValue : num)
    }));
  };

  const handleMarkChange = (key: string, field: string, value: string) => {
    const newValue = parseFloat(value) || 0;
    setData(prevData => 
      prevData.map(item => {
        if (item.key === key) {
          const updatedItem = {
            ...item,
            [field]: newValue
          };
          
          // Calculate carry marks (sum of quiz, assignment, and test marks)
          const carryMarks = 
            (updatedItem.quiz1 + updatedItem.quiz2 + updatedItem.quiz3) + // Quiz total
            (updatedItem.assignment1 + updatedItem.assignment2 + updatedItem.assignment3) + // Assignment total
            (updatedItem.test1 + updatedItem.test2 + updatedItem.test3); // Test total
          
          // Calculate final marks
          const finalMarks = 
            (updatedItem.final1 + updatedItem.final2 + updatedItem.final3);
          
          updatedItem.carryMarks = carryMarks;
          
          // Calculate weighted total for the total column
          const weightedTotal = 
            (carryMarks * 0.6) + // 60% of carry marks
            (finalMarks * 0.4/3); // 40% of final marks
          
          updatedItem.total = weightedTotal;
          
          // Calculate overall total (sum of all raw marks)
          updatedItem.overallTotal = carryMarks + finalMarks;
          
          // Calculate grade based on overall total
          updatedItem.grade = calculateGrade(updatedItem.overallTotal);
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleNameChange = (key: string, value: string) => {
    setData(prevData =>
      prevData.map(item =>
        item.key === key ? { ...item, name: value } : item
      )
    );
  };

  const addStudent = () => {
    const newStudent: StudentMarks = {
      key: (data.length + 1).toString(),
      no: data.length + 1,
      name: '',
      quiz1: 0,
      quiz2: 0,
      quiz3: 0,
      assignment1: 0,
      assignment2: 0,
      assignment3: 0,
      test1: 0,
      test2: 0,
      test3: 0,
      carryMarks: 0,
      final1: 0,
      final2: 0,
      final3: 0,
      total: 0,
      overallTotal: 0,
      grade: 'F'
    };
    setData([...data, newStudent]);
  };

  const removeStudent = (key: string) => {
    setData(prevData => {
      const newData = prevData.filter(item => item.key !== key);
      return newData.map((item, index) => ({
        ...item,
        no: index + 1,
        key: (index + 1).toString()
      }));
    });
  };

  const getAssessmentColumn = (
    title: string,
    type: keyof CLOPLOMapping,
    children: { dataIndex: string; maxMark: number }[]
  ) => ({
    title: () => (
      <div className="space-y-2">
        <div className="font-bold">{title}</div>
        <div className="grid grid-cols-3 gap-2">
          {children.map((_, index) => (
            <div key={index} className="text-center">
              <div className="text-xs mb-1">{index + 1}</div>
              <div className="space-y-1">
                <Tooltip title="Course Learning Outcome">
                  <Input
                    size="small"
                    prefix={<InfoCircleOutlined className="text-gray-400" />}
                    value={cloNumbers[type][index]}
                    onChange={(e) => handleCLOChange(type, index, e.target.value)}
                    className="w-16"
                    placeholder="CLO"
                  />
                </Tooltip>
                <Tooltip title="Programme Learning Outcome">
                  <Input
                    size="small"
                    prefix={<InfoCircleOutlined className="text-gray-400" />}
                    value={ploNumbers[type][index]}
                    onChange={(e) => handlePLOChange(type, index, e.target.value)}
                    className="w-16"
                    placeholder="PLO"
                  />
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
        <div className="font-bold">ALLOCATED MARKS</div>
      </div>
    ),
    children: children.map((child, index) => ({
      title: `${index + 1}`,
      dataIndex: child.dataIndex,
      width: 60,
      render: (text: number, record: StudentMarks) => (
        <Input
          type="number"
          value={text}
          onChange={(e) => handleMarkChange(record.key, child.dataIndex, e.target.value)}
          min={0}
          max={child.maxMark}
        />
      )
    }))
  });

  const columns: ColumnsType<StudentMarks> = [
    {
      title: 'NAME OF STUDENT',
      dataIndex: 'name',
      width: 250,
      fixed: 'left',
      render: (text: string, record: StudentMarks) => (
        <Input
          value={text}
          onChange={(e) => handleNameChange(record.key, e.target.value)}
          placeholder="Enter student name"
        />
      )
    },
    getAssessmentColumn('QUIZ - 10%', 'quiz', [
      { dataIndex: 'quiz1', maxMark: 10 },
      { dataIndex: 'quiz2', maxMark: 10 },
      { dataIndex: 'quiz3', maxMark: 10 }
    ]),
    getAssessmentColumn('ASSIGNMENT - 20%', 'assignment', [
      { dataIndex: 'assignment1', maxMark: 20 },
      { dataIndex: 'assignment2', maxMark: 20 },
      { dataIndex: 'assignment3', maxMark: 20 }
    ]),
    getAssessmentColumn('TEST - 20%', 'test', [
      { dataIndex: 'test1', maxMark: 20 },
      { dataIndex: 'test2', maxMark: 20 },
      { dataIndex: 'test3', maxMark: 20 }
    ]),
    {
      title: 'CARRY MARKS',
      dataIndex: 'carryMarks',
      width: 100,
      render: (text) => text.toFixed(2)
    },
    getAssessmentColumn('FINAL - 40%', 'final', [
      { dataIndex: 'final1', maxMark: 40 },
      { dataIndex: 'final2', maxMark: 40 },
      { dataIndex: 'final3', maxMark: 40 }
    ]),
    {
      title: 'TOTAL',
      dataIndex: 'total',
      width: 80,
      render: (text) => text.toFixed(2)
    },
    {
      title: 'OVERALL TOTAL',
      dataIndex: 'overallTotal',
      width: 100,
      render: (text) => text.toFixed(2)
    },
    {
      title: 'GRADE',
      dataIndex: 'grade',
      width: 80,
      render: (text) => (
        <div style={{ fontWeight: 'bold', color: getGradeColor(text) }}>
          {text}
        </div>
      )
    }
  ];

  const normalize = (value: number, maxMark: number) => {
    if (value === 0) return 0;
    const average = value / (data.length || 1); // Calculate average
    return parseFloat((average / maxMark).toFixed(2)); // Normalize by dividing average by max mark
  };

  const summary = (pageData: readonly StudentMarks[]) => {
    const totals = pageData.reduce((acc, curr) => ({
      quiz1: acc.quiz1 + curr.quiz1,
      quiz2: acc.quiz2 + curr.quiz2,
      quiz3: acc.quiz3 + curr.quiz3,
      assignment1: acc.assignment1 + curr.assignment1,
      assignment2: acc.assignment2 + curr.assignment2,
      assignment3: acc.assignment3 + curr.assignment3,
      test1: acc.test1 + curr.test1,
      test2: acc.test2 + curr.test2,
      test3: acc.test3 + curr.test3,
      carryMarks: acc.carryMarks + curr.carryMarks,
      final1: acc.final1 + curr.final1,
      final2: acc.final2 + curr.final2,
      final3: acc.final3 + curr.final3,
      total: acc.total + curr.total,
      overallTotal: acc.overallTotal + curr.overallTotal
    }), {
      quiz1: 0, quiz2: 0, quiz3: 0,
      assignment1: 0, assignment2: 0, assignment3: 0,
      test1: 0, test2: 0, test3: 0,
      carryMarks: 0,
      final1: 0, final2: 0, final3: 0,
      total: 0,
      overallTotal: 0
    });

    const getPercentage = (value: number, maxMark: number, weightage: number, isFinal: boolean = false) => {
      if (value === 0) return 0;
      const average = value / (pageData.length || 1); // Get the average value
      // For final exam, divide weightage by 3 since it involves all CLOs
      // For others (quiz, test, assignment), use full weightage as they belong to one CLO
      const actualWeightage = isFinal ? weightage / 3 : weightage;
      return Math.round((average / maxMark) * actualWeightage);
    };

    const normalize = (value: number, maxMark: number) => {
      if (value === 0) return 0;
      const average = value / (pageData.length || 1);
      return parseFloat((average / maxMark).toFixed(2));
    };

    return (
      <Table.Summary>
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>OVERALL TOTAL</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>{totals.quiz1.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={2}>{totals.quiz2.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={3}>{totals.quiz3.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={4}>{totals.assignment1.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={5}>{totals.assignment2.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={6}>{totals.assignment3.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={7}>{totals.test1.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={8}>{totals.test2.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={9}>{totals.test3.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={10}>{totals.carryMarks.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={11}>{totals.final1.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={12}>{totals.final2.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={13}>{totals.final3.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={14}>{totals.total.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={15}>{totals.overallTotal.toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={16}></Table.Summary.Cell>
        </Table.Summary.Row>

        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>NO. OF STUDENTS</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={2}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={3}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={4}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={5}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={6}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={7}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={8}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={9}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={10}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={11}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={12}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={13}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={14}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={15}>{pageData.length}</Table.Summary.Cell>
          <Table.Summary.Cell index={16}></Table.Summary.Cell>
        </Table.Summary.Row>

        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>AVERAGE</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>{(totals.quiz1 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={2}>{(totals.quiz2 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={3}>{(totals.quiz3 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={4}>{(totals.assignment1 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={5}>{(totals.assignment2 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={6}>{(totals.assignment3 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={7}>{(totals.test1 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={8}>{(totals.test2 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={9}>{(totals.test3 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={10}>{(totals.carryMarks / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={11}>{(totals.final1 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={12}>{(totals.final2 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={13}>{(totals.final3 / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={14}>{(totals.total / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={15}>{(totals.overallTotal / pageData.length).toFixed(2)}</Table.Summary.Cell>
          <Table.Summary.Cell index={16}></Table.Summary.Cell>
        </Table.Summary.Row>

        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>PERCENTAGE</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>{getPercentage(totals.quiz1, 10, 10)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={2}>{getPercentage(totals.quiz2, 10, 10)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={3}>{getPercentage(totals.quiz3, 10, 10)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={4}>{getPercentage(totals.assignment1, 20, 20)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={5}>{getPercentage(totals.assignment2, 20, 20)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={6}>{getPercentage(totals.assignment3, 20, 20)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={7}>{getPercentage(totals.test1, 20, 20)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={8}>{getPercentage(totals.test2, 20, 20)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={9}>{getPercentage(totals.test3, 20, 20)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={10}>{getPercentage(totals.carryMarks, 60, 50)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={11}>{getPercentage(totals.final1, 40, 40, true)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={12}>{getPercentage(totals.final2, 40, 40, true)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={13}>{getPercentage(totals.final3, 40, 40, true)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={14}>{getPercentage(totals.total, 100, 100)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={15}>{getPercentage(totals.overallTotal, 100, 100)}%</Table.Summary.Cell>
          <Table.Summary.Cell index={16}></Table.Summary.Cell>
        </Table.Summary.Row>

        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>NORMALIZE</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>{normalize(totals.quiz1, 10)}</Table.Summary.Cell>
          <Table.Summary.Cell index={2}>{normalize(totals.quiz2, 10)}</Table.Summary.Cell>
          <Table.Summary.Cell index={3}>{normalize(totals.quiz3, 10)}</Table.Summary.Cell>
          <Table.Summary.Cell index={4}>{normalize(totals.assignment1, 20)}</Table.Summary.Cell>
          <Table.Summary.Cell index={5}>{normalize(totals.assignment2, 20)}</Table.Summary.Cell>
          <Table.Summary.Cell index={6}>{normalize(totals.assignment3, 20)}</Table.Summary.Cell>
          <Table.Summary.Cell index={7}>{normalize(totals.test1, 20)}</Table.Summary.Cell>
          <Table.Summary.Cell index={8}>{normalize(totals.test2, 20)}</Table.Summary.Cell>
          <Table.Summary.Cell index={9}>{normalize(totals.test3, 20)}</Table.Summary.Cell>
          <Table.Summary.Cell index={10}>{normalize(totals.carryMarks, 60)}</Table.Summary.Cell>
          <Table.Summary.Cell index={11}>{normalize(totals.final1, 40)}</Table.Summary.Cell>
          <Table.Summary.Cell index={12}>{normalize(totals.final2, 40)}</Table.Summary.Cell>
          <Table.Summary.Cell index={13}>{normalize(totals.final3, 40)}</Table.Summary.Cell>
          <Table.Summary.Cell index={14}>{normalize(totals.total, 100)}</Table.Summary.Cell>
          <Table.Summary.Cell index={15}>{normalize(totals.overallTotal, 100)}</Table.Summary.Cell>
          <Table.Summary.Cell index={16}></Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    );
  };

  // Add save to database function
  const saveToDatabase = async () => {
    try {
      setLoading(true);
      
      // Calculate normalized values
      const normalize = (value: number, maxMark: number) => 
        value === 0 ? 0 : parseFloat((value / maxMark).toFixed(2));

      const marksData = data.map(item => ({
        student_name: item.name,
        // Raw marks
        quiz1: item.quiz1,
        quiz2: item.quiz2,
        quiz3: item.quiz3,
        assignment1: item.assignment1,
        assignment2: item.assignment2,
        assignment3: item.assignment3,
        test1: item.test1,
        test2: item.test2,
        test3: item.test3,
        final1: item.final1,
        final2: item.final2,
        final3: item.final3,
        carry_marks: item.carryMarks,
        total: item.total,
        overall_total: item.overallTotal,
        grade: item.grade,
        // Normalized values
        normalized_quiz1: normalize(item.quiz1, 10),
        normalized_quiz2: normalize(item.quiz2, 10),
        normalized_quiz3: normalize(item.quiz3, 10),
        normalized_assignment1: normalize(item.assignment1, 20),
        normalized_assignment2: normalize(item.assignment2, 20),
        normalized_assignment3: normalize(item.assignment3, 20),
        normalized_test1: normalize(item.test1, 20),
        normalized_test2: normalize(item.test2, 20),
        normalized_test3: normalize(item.test3, 20),
        normalized_final1: normalize(item.final1, 40),
        normalized_final2: normalize(item.final2, 40),
        normalized_final3: normalize(item.final3, 40),
        // CLO mappings
        clo_quiz1: cloNumbers.quiz[0],
        clo_quiz2: cloNumbers.quiz[1],
        clo_quiz3: cloNumbers.quiz[2],
        clo_assignment1: cloNumbers.assignment[0],
        clo_assignment2: cloNumbers.assignment[1],
        clo_assignment3: cloNumbers.assignment[2],
        clo_test1: cloNumbers.test[0],
        clo_test2: cloNumbers.test[1],
        clo_test3: cloNumbers.test[2],
        clo_final1: cloNumbers.final[0],
        clo_final2: cloNumbers.final[1],
        clo_final3: cloNumbers.final[2],
        // PLO mappings
        plo_quiz1: ploNumbers.quiz[0],
        plo_quiz2: ploNumbers.quiz[1],
        plo_quiz3: ploNumbers.quiz[2],
        plo_assignment1: ploNumbers.assignment[0],
        plo_assignment2: ploNumbers.assignment[1],
        plo_assignment3: ploNumbers.assignment[2],
        plo_test1: ploNumbers.test[0],
        plo_test2: ploNumbers.test[1],
        plo_test3: ploNumbers.test[2],
        plo_final1: ploNumbers.final[0],
        plo_final2: ploNumbers.final[1],
        plo_final3: ploNumbers.final[2]
      }));

      const { error } = await supabase
        .from('student_marks')
        .upsert(marksData, { onConflict: 'student_name' });

      if (error) throw error;
      messageApi.success('Marks saved successfully!');
    } catch (error) {
      console.error('Error saving marks:', error);
      messageApi.error('Failed to save marks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add export to Excel function
  const exportToExcel = () => {
    try {
      // Calculate normalized values
      const normalize = (value: number, maxMark: number) => 
        value === 0 ? 0 : parseFloat((value / maxMark).toFixed(2));

      const exportData = data.map(item => ({
        'Student Name': item.name,
        // Raw Marks
        'Quiz 1': item.quiz1,
        'Quiz 2': item.quiz2,
        'Quiz 3': item.quiz3,
        'Assignment 1': item.assignment1,
        'Assignment 2': item.assignment2,
        'Assignment 3': item.assignment3,
        'Test 1': item.test1,
        'Test 2': item.test2,
        'Test 3': item.test3,
        'Carry Marks': item.carryMarks,
        'Final 1': item.final1,
        'Final 2': item.final2,
        'Final 3': item.final3,
        'Total': item.total,
        'Overall Total': item.overallTotal,
        'Grade': item.grade,
        // Normalized Values
        'Normalized Quiz 1': normalize(item.quiz1, 10),
        'Normalized Quiz 2': normalize(item.quiz2, 10),
        'Normalized Quiz 3': normalize(item.quiz3, 10),
        'Normalized Assignment 1': normalize(item.assignment1, 20),
        'Normalized Assignment 2': normalize(item.assignment2, 20),
        'Normalized Assignment 3': normalize(item.assignment3, 20),
        'Normalized Test 1': normalize(item.test1, 20),
        'Normalized Test 2': normalize(item.test2, 20),
        'Normalized Test 3': normalize(item.test3, 20),
        'Normalized Final 1': normalize(item.final1, 40),
        'Normalized Final 2': normalize(item.final2, 40),
        'Normalized Final 3': normalize(item.final3, 40),
        // CLO Mappings
        'CLO Quiz 1': cloNumbers.quiz[0],
        'CLO Quiz 2': cloNumbers.quiz[1],
        'CLO Quiz 3': cloNumbers.quiz[2],
        'CLO Assignment 1': cloNumbers.assignment[0],
        'CLO Assignment 2': cloNumbers.assignment[1],
        'CLO Assignment 3': cloNumbers.assignment[2],
        'CLO Test 1': cloNumbers.test[0],
        'CLO Test 2': cloNumbers.test[1],
        'CLO Test 3': cloNumbers.test[2],
        'CLO Final 1': cloNumbers.final[0],
        'CLO Final 2': cloNumbers.final[1],
        'CLO Final 3': cloNumbers.final[2],
        // PLO Mappings
        'PLO Quiz 1': ploNumbers.quiz[0],
        'PLO Quiz 2': ploNumbers.quiz[1],
        'PLO Quiz 3': ploNumbers.quiz[2],
        'PLO Assignment 1': ploNumbers.assignment[0],
        'PLO Assignment 2': ploNumbers.assignment[1],
        'PLO Assignment 3': ploNumbers.assignment[2],
        'PLO Test 1': ploNumbers.test[0],
        'PLO Test 2': ploNumbers.test[1],
        'PLO Test 3': ploNumbers.test[2],
        'PLO Final 1': ploNumbers.final[0],
        'PLO Final 2': ploNumbers.final[1],
        'PLO Final 3': ploNumbers.final[2]
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Student Marks');

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, 'student_marks.xlsx');
      messageApi.success('Marks exported successfully!');
    } catch (error) {
      console.error('Error exporting marks:', error);
      messageApi.error('Failed to export marks. Please try again.');
    }
  };

  return (
    <main className="min-h-screen p-8">
      {contextHolder}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mark Entry System</h1>
        <div className="space-x-2">
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={saveToDatabase}
            loading={loading}
          >
            Save Marks
          </Button>
          <Button
            type="default"
            icon={<FileExcelOutlined />}
            onClick={exportToExcel}
          >
            Export to Excel
          </Button>
          <Button
            type="default"
            onClick={addStudent}
          >
            Add Student
          </Button>

        </div>
    </div>


    <Card className="mb-4">
        <Descriptions bordered column={2} size="small" layout="vertical">
          <Descriptions.Item label="PROGRAMME NAME" span={2}>
            <Input
              value={courseInfo.programName}
              onChange={e => handleCourseInfoChange('programName', e.target.value)}
              placeholder="Enter programme name"
            />
          </Descriptions.Item>
          <Descriptions.Item label="COURSE NAME">
            <Input
              value={courseInfo.courseName}
              onChange={e => handleCourseInfoChange('courseName', e.target.value)}
              placeholder="Enter course name"
            />
          </Descriptions.Item>
          <Descriptions.Item label="COURSE CODE">
            <Input
              value={courseInfo.courseCode}
              onChange={e => handleCourseInfoChange('courseCode', e.target.value)}
              placeholder="Enter course code"
            />
          </Descriptions.Item>
          <Descriptions.Item label="LECTURER'S NAME">
            <Input
              value={courseInfo.lecturerName}
              onChange={e => handleCourseInfoChange('lecturerName', e.target.value)}
              placeholder="Enter lecturer's name"
            />
          </Descriptions.Item>
          <Descriptions.Item label="SEMESTER">
            <Input
              value={courseInfo.semester}
              onChange={e => handleCourseInfoChange('semester', e.target.value)}
              placeholder="Enter semester"
            />
          </Descriptions.Item>
          <Descriptions.Item label="ACADEMIC SESSION" span={2}>
            <Input
              value={courseInfo.academicSession}
              onChange={e => handleCourseInfoChange('academicSession', e.target.value)}
              placeholder="Enter academic session"
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={data}
          pagination={false}
          bordered
          summary={summary}
          scroll={{ x: 'max-content', y: 'calc(100vh - 450px)' }}
        />
      </Card>
    </main>
  );
}

  