import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase'; // Make sure path matches your project!

export default function FeesScreen() {
  const [amountSLL, setAmountSLL] = useState('');
  const [expectedFeeInput, setExpectedFeeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); 
  
  const [school, setSchool] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // 🌟 FEATURE 3: NEWS STATE
  const [news, setNews] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const paymentOptions = ['Cash', 'Orange Money', 'Afrimoney', 'Bank Transfer'];

  useEffect(() => { loadInitialData(); },[]);
  
  // 🌟 FEATURE 3: ADDED fetchNews() to the school useEffect
  useEffect(() => { 
    if (school) { 
      fetchStudents(); 
      fetchTransactions(); 
      fetchNews(); 
      setSelectedStudentId(null); 
    } 
  }, [school]);

  async function loadInitialData() {
    setFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('users').select('school_id').eq('email', user.email).single();
      if (profile && profile.school_id) {
        const { data: schoolData } = await supabase.from('schools').select('*').eq('id', profile.school_id).single();
        if (schoolData) setSchool(schoolData);
      }
    } catch (err) { Alert.alert("Error", "Could not load school data."); }
    setFetching(false);
  }

  async function fetchStudents() {
    const { data } = await supabase
      .from('students')
      .select('id, admission_number, current_class, expected_fee, date_of_birth, created_at, users!user_id(full_name, phone_number)')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false });
    if (data) setStudents(data);
  }

  async function fetchTransactions() {
    setFetching(true);
    const { data } = await supabase
      .from('fee_transactions')
      .select('*, students!student_id(admission_number, current_class, users!user_id(full_name))')
      .eq('school_id', school.id)
      .order('payment_date', { ascending: false });
    if (data) setTransactions(data);
    setFetching(false);
  }

  // 🌟 FEATURE 3: FETCH BROADCASTS FUNCTION
  async function fetchNews() {
    const { data } = await supabase
      .from('school_news')
      .select('*')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false })
      .limit(5); // Keep it clean by only showing the 5 most recent notices
    if (data) setNews(data);
  }

  async function deleteTransaction(transactionId: string) {
    Alert.alert('Delete Transaction', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('fee_transactions').delete().eq('id', transactionId);
        if (error) Alert.alert('Error', 'Could not delete.');
        else fetchTransactions();
      }}
    ]);
  }

  async function updateExpectedFee() {
    if (!selectedStudentId) { Alert.alert('Error', 'Select a student.'); return; }
    if (!expectedFeeInput || isNaN(Number(expectedFeeInput))) { Alert.alert('Error', 'Enter a valid amount.'); return; }
    setLoading(true);
    const { error } = await supabase.from('students').update({ expected_fee: Number(expectedFeeInput) }).eq('id', selectedStudentId);
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else { Alert.alert('Success', 'Expected fee updated.'); setExpectedFeeInput(''); fetchStudents(); }
  }

  async function recordPayment() {
    if (!selectedStudentId) { Alert.alert('Error', 'Please select a student.'); return; }
    if (!amountSLL || isNaN(Number(amountSLL))) { Alert.alert('Error', 'Please enter a valid amount.'); return; }
    setLoading(true);
    const receiptNum = 'REC-' + Math.floor(100000 + Math.random() * 900000);
    const { error } = await supabase.from('fee_transactions').insert([{ school_id: school.id, student_id: selectedStudentId, amount_paid_sll: Number(amountSLL), payment_method: paymentMethod, receipt_number: receiptNum }]);
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else { Alert.alert('Success!', `Receipt ${receiptNum} generated.`); setAmountSLL(''); fetchTransactions(); }
  }

  function formatCurrency(amount: number) { 
    return "SLL " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); 
  }

  const studentLedgers = students.map(student => {
    const studentPayments = transactions.filter(t => t.student_id === student.id);
    const totalPaid = studentPayments.reduce((sum, t) => sum + Number(t.amount_paid_sll), 0);
    const expected = Number(student.expected_fee) || 0;
    const balance = expected - totalPaid;
    
    let status = 'UNPAID';
    if (expected > 0 && balance <= 0) status = 'PAID';
    else if (totalPaid > 0 && balance > 0) status = 'PARTIAL';

    return { ...student, totalPaid, expected, balance, status };
  });

  const filteredLedgers = filter === 'ALL' ? studentLedgers : studentLedgers.filter(s => s.status === filter);
  const selectedStudentData = studentLedgers.find(s => s.id === selectedStudentId);

  const globalExpected = studentLedgers.reduce((sum, s) => sum + s.expected, 0);
  const globalCollected = studentLedgers.reduce((sum, s) => sum + s.totalPaid, 0);
  const globalOutstanding = globalExpected - globalCollected;

  async function generateMasterLedgerPDF() {
    setPrintingId('master');
    try {
      const logoHtml = school?.logo_url && school.logo_url.startsWith('http') 
        ? `<img src="${school.logo_url}" style="height: 70px; margin-bottom: 10px;" />` 
        : `<div style="height: 70px; width: 70px; border: 2px solid #1A365D; display: inline-block; margin-bottom: 10px; text-align: center; line-height: 70px; font-weight: bold; color:#1A365D; border-radius: 50%;">LOGO</div>`;

      let tableRows = '';
      
      studentLedgers.forEach((std, index) => {
        const phone = std.users?.phone_number || 'N/A';
        const dob = std.date_of_birth || 'N/A';
        const enrolledYear = std.created_at ? new Date(std.created_at).getFullYear() : 'N/A';
        const statusColor = std.status === 'PAID' ? '#38A169' : std.status === 'PARTIAL' ? '#DD6B20' : '#E53E3E';

        tableRows += `
          <tr>
            <td>${index + 1}</td>
            <td style="font-weight: bold; color: #2D3748;">${std.admission_number}</td>
            <td style="text-align: left; font-weight: 900; color: #1A365D;">${std.users?.full_name || 'Unknown'}</td>
            <td>${dob}</td>
            <td>${std.current_class}</td>
            <td>${phone}</td>
            <td>${enrolledYear}</td>
            <td style="font-weight: bold;">${formatCurrency(std.expected)}</td>
            <td style="color: #38A169; font-weight: 900;">${formatCurrency(std.totalPaid)}</td>
            <td style="color: ${statusColor}; font-weight: 900;">${formatCurrency(std.balance)}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${std.status}</td>
          </tr>
        `;
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748; background: #FFF; font-size: 10px; }
              .header { text-align: center; border-bottom: 3px solid #1A365D; padding-bottom: 15px; margin-bottom: 20px; }
              .school-name { font-size: 26px; font-weight: 900; color: #1A365D; text-transform: uppercase; margin: 5px 0; }
              .report-title { font-size: 14px; font-weight: bold; color: #4A5568; letter-spacing: 1px; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #CBD5E0; padding: 8px 4px; text-align: center; }
              th { background-color: #EDF2F7; color: #1A365D; font-weight: 900; font-size: 11px; text-transform: uppercase; }
              tr:nth-child(even) { background-color: #F7FAFC; }
              .summary-box { display: flex; justify-content: space-around; background-color: #EBF8FF; padding: 15px; border-radius: 8px; margin-top: 10px; border: 1px solid #BEE3F8; }
              .summary-item { text-align: center; }
              .summary-label { font-size: 12px; color: #4A5568; font-weight: bold; text-transform: uppercase; }
              .summary-val { font-size: 20px; font-weight: 900; margin-top: 5px; }
              .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #A0AEC0; border-top: 1px solid #E2E8F0; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoHtml}
              <h1 class="school-name">${school?.name || 'School Report'}</h1>
              <div class="report-title">MASTER STUDENT BIO & FINANCIAL LEDGER</div>
              <p>Generated by Bursar Office on ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="summary-box">
              <div class="summary-item"><div class="summary-label">Total Expected Fees</div><div class="summary-val" style="color: #1A365D;">${formatCurrency(globalExpected)}</div></div>
              <div class="summary-item"><div class="summary-label">Total Amount Paid</div><div class="summary-val" style="color: #38A169;">${formatCurrency(globalCollected)}</div></div>
              <div class="summary-item"><div class="summary-label">Total Outstanding Balance</div><div class="summary-val" style="color: #E53E3E;">${formatCurrency(globalOutstanding)}</div></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 3%;">S/N</th>
                  <th style="width: 10%;">Inv/Adm No.</th>
                  <th style="text-align: left; width: 17%;">Full Name</th>
                  <th style="width: 8%;">DOB</th>
                  <th style="width: 8%;">Class</th>
                  <th style="width: 10%;">Telephone</th>
                  <th style="width: 7%;">Enrolled</th>
                  <th style="width: 10%;">Expected Fee</th>
                  <th style="width: 10%;">Amount Paid</th>
                  <th style="width: 10%;">Balance</th>
                  <th style="width: 7%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            
            <div class="footer">
              Official Document • Securely Generated by EduSalone System • Do Not Alter
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          setTimeout(() => { printWindow.print(); }, 500); 
        } else Alert.alert('Popup Blocked', 'Please allow popups.');
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { Alert.alert('System Error', 'Failed to generate Ledger: ' + error.message); }
    setPrintingId(null);
  }

async function generateReceiptPDF(transaction: any) {
    setPrintingId(transaction.id);
    try {
      const amountFormatted = formatCurrency(transaction.amount_paid_sll);
      const dateFormatted = new Date(transaction.payment_date).toLocaleDateString('en-GB');
      const studentName = transaction.students?.users?.full_name?.toUpperCase() || 'UNKNOWN';
      const studentClass = transaction.students?.current_class || 'N/A';
      const studentAdm = transaction.students?.admission_number || 'N/A';

      // ---- Full fee summary (reuses the same data the on-screen ledger uses) ----
      // Find this student's expected fee and ALL their payments, so the receipt
      // shows Expected, Total Paid So Far, Balance Remaining, and every payment.
      const studentRow = students.find(s => s.id === transaction.student_id);
      const expectedFee = Number(studentRow?.expected_fee) || 0;
      const allPayments = transactions.filter(t => t.student_id === transaction.student_id);
      const totalPaid = allPayments.reduce((sum, t) => sum + Number(t.amount_paid_sll), 0);
      const balance = expectedFee - totalPaid;
      const balanceColor = balance <= 0 ? '#22543D' : '#C53030';
      const balanceLabel = balance <= 0 ? 'FULLY PAID' : 'BALANCE REMAINING';
      const balanceShown = balance <= 0 ? formatCurrency(0) : formatCurrency(balance);

      // Every payment, oldest first, as a mini statement
      const historyRows = [...allPayments]
        .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
        .map(t => `
          <tr>
            <td>${new Date(t.payment_date).toLocaleDateString('en-GB')}</td>
            <td style="font-weight:bold;color:#2B6CB0;">${t.receipt_number || '-'}</td>
            <td>${t.payment_method || '-'}</td>
            <td style="text-align:right;font-weight:900;color:#22543D;">${formatCurrency(Number(t.amount_paid_sll))}</td>
          </tr>`).join('');

      const logoHtml = school?.logo_url
        ? `<img src="${school.logo_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #1A365D;" />`
        : `<div style="width:80px;height:80px;border-radius:50%;background:#1A365D;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;text-align:center;line-height:1.2;padding:5px;">EDU<br/>SALONE</div>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @page { size: A5; margin: 8mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #FFF; color: #1A202C; }
              .page { border: 3px solid #1A365D; border-radius: 12px; overflow: hidden; }
              .top-stripe { background: #1A365D; height: 8px; }
              .header { background: linear-gradient(135deg, #1A365D 0%, #2B6CB0 100%); padding: 20px 24px; display: flex; align-items: center; }
              .logo-wrap { width: 80px; height: 80px; flex-shrink: 0; }
              .school-info { flex: 1; padding-left: 16px; }
              .school-name { color: #FFF; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; }
              .receipt-badge { display: inline-block; background: #D69E2E; color: #FFF; font-size: 10px; font-weight: 900; letter-spacing: 2px; padding: 4px 10px; border-radius: 20px; margin-top: 6px; }
              .id-bar { background: #EBF8FF; border-top: 1px solid #BEE3F8; border-bottom: 1px solid #BEE3F8; padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; }
              .receipt-num { font-size: 15px; font-weight: 900; color: #2B6CB0; letter-spacing: 1px; }
              .receipt-date { font-size: 13px; color: #4A5568; font-weight: bold; }
              .body { padding: 20px 24px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
              .info-box { background: #F7FAFC; border-radius: 8px; padding: 12px; border-left: 3px solid #2B6CB0; }
              .info-label { font-size: 9px; font-weight: 900; color: #718096; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
              .info-value { font-size: 14px; font-weight: 900; color: #1A365D; }
              .amount-section { background: linear-gradient(135deg, #F0FFF4, #E6FFFA); border: 2px solid #38A169; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 18px; }
              .amount-label { font-size: 10px; font-weight: 900; color: #276749; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
              .amount-value { font-size: 34px; font-weight: 900; color: #22543D; }
              .method-tag { display: inline-block; background: #C6F6D5; color: #22543D; font-size: 11px; font-weight: 900; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
              /* FEE SUMMARY */
              .fee-summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 18px; }
              .fee-cell { border-radius: 8px; padding: 12px 8px; text-align: center; border: 1.5px solid; }
              .fee-cell .fl { font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
              .fee-cell .fv { font-size: 14px; font-weight: 900; }
              .fee-expected { background: #EBF8FF; border-color: #BEE3F8; }
              .fee-expected .fl, .fee-expected .fv { color: #1A365D; }
              .fee-paid { background: #F0FFF4; border-color: #9AE6B4; }
              .fee-paid .fl, .fee-paid .fv { color: #22543D; }
              .fee-balance { background: #FFF5F5; border-color: #FEB2B2; }
              /* PAYMENT HISTORY */
              .hist-title { font-size: 11px; font-weight: 900; color: #1A365D; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid #E2E8F0; }
              .hist-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
              .hist-table th { background: #1A365D; color: #FFF; padding: 7px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
              .hist-table th:last-child { text-align: right; }
              .hist-table td { padding: 7px 8px; border-bottom: 1px solid #EDF2F7; }
              .hist-table tr:nth-child(even) td { background: #F7FAFC; }
              .sig-section { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 16px; border-top: 1px dashed #CBD5E0; }
              .sig-box { text-align: center; width: 45%; }
              .sig-line { border-top: 1.5px solid #4A5568; margin-bottom: 6px; }
              .sig-label { font-size: 10px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
              .footer { background: #1A365D; padding: 10px 24px; text-align: center; }
              .footer-text { color: rgba(255,255,255,0.7); font-size: 9px; letter-spacing: 0.5px; }
              .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 60px; color: rgba(26,54,93,0.04); font-weight: 900; z-index: 0; white-space: nowrap; pointer-events: none; }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="top-stripe"></div>
              <div class="header">
                <div class="logo-wrap">${logoHtml}</div>
                <div class="school-info">
                  <div class="school-name">${school?.name || 'School Name'}</div>
                  <div class="receipt-badge">OFFICIAL FEE RECEIPT</div>
                </div>
              </div>
              <div class="id-bar">
                <div class="receipt-num">🧾 ${transaction.receipt_number}</div>
                <div class="receipt-date">📅 ${dateFormatted}</div>
              </div>
              <div class="body">
                <div class="watermark">PAID</div>
                <div class="info-grid">
                  <div class="info-box" style="grid-column: span 2;">
                    <div class="info-label">Student Full Name</div>
                    <div class="info-value">${studentName}</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Class</div>
                    <div class="info-value">${studentClass}</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Admission No.</div>
                    <div class="info-value">${studentAdm}</div>
                  </div>
                </div>

                <div class="amount-section">
                  <div class="amount-label">Amount Paid (This Receipt)</div>
                  <div class="amount-value">${amountFormatted}</div>
                  <div class="method-tag">💳 ${transaction.payment_method}</div>
                </div>

                <div class="fee-summary">
                  <div class="fee-cell fee-expected">
                    <div class="fl">Expected Fee</div>
                    <div class="fv">${formatCurrency(expectedFee)}</div>
                  </div>
                  <div class="fee-cell fee-paid">
                    <div class="fl">Total Paid So Far</div>
                    <div class="fv">${formatCurrency(totalPaid)}</div>
                  </div>
                  <div class="fee-cell fee-balance">
                    <div class="fl" style="color:${balanceColor};">${balanceLabel}</div>
                    <div class="fv" style="color:${balanceColor};">${balanceShown}</div>
                  </div>
                </div>

                <div class="hist-title">Payment History</div>
                <table class="hist-table">
                  <thead>
                    <tr><th>Date</th><th>Receipt</th><th>Method</th><th>Amount</th></tr>
                  </thead>
                  <tbody>${historyRows}</tbody>
                </table>

                <div class="sig-section">
                  <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-label">Authorized Signature</div>
                  </div>
                  <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-label">Official Stamp</div>
                  </div>
                </div>
              </div>
              <div class="footer">
                <div class="footer-text">This is an official document generated by EduSalone • ${new Date().toLocaleString()} • Do not alter</div>
              </div>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { Alert.alert('System Error', 'Failed to generate Receipt: ' + error.message); }
    setPrintingId(null);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
           <Text style={styles.headerTitle}>Fee Management</Text>
           <TouchableOpacity style={styles.masterPrintBtn} onPress={generateMasterLedgerPDF} disabled={printingId === 'master'}>
             {printingId === 'master' ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="print" size={20} color="#FFF" />}
           </TouchableOpacity>
        </View>
        <Text style={styles.subText}>School fees in Sierra Leonean Leones (SLL)</Text>

        {/* FINANCIAL OVERVIEW */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderColor: '#3182CE' }]}><Text style={[styles.statLabel, {color: '#3182CE'}]}>Total Fees</Text><Text style={[styles.statValue, {color: '#3182CE'}]}>{formatCurrency(globalExpected)}</Text></View>
          <View style={[styles.statBox, { borderColor: '#38A169' }]}><Text style={[styles.statLabel, {color: '#38A169'}]}>Total Collected</Text><Text style={[styles.statValue, {color: '#38A169'}]}>{formatCurrency(globalCollected)}</Text></View>
          <View style={[styles.statBox, { borderColor: '#E53E3E' }]}><Text style={[styles.statLabel, {color: '#E53E3E'}]}>Outstanding</Text><Text style={[styles.statValue, {color: '#E53E3E'}]}>{formatCurrency(globalOutstanding)}</Text></View>
        </View>

        {/* 🌟 FEATURE 3: BURSAR NOTICEBOARD FEED */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="megaphone" size={20} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>School Broadcasts</Text>
          </View>
          
          {news.length > 0 ? (
            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {news.map(n => (
                <View key={n.id} style={styles.newsItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.newsAuthor}>{n.author_name}</Text>
                    <Text style={styles.newsDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.newsContent}>{n.content}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No official notices broadcasted yet.</Text>
          )}
        </View>

        {/* LEDGER FILTERS */}
        <View style={styles.filterRow}>
          {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f as any)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* STUDENT SELECTOR */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Select Student Account</Text>
          {/* 🔍 SMART SEARCH */}
          <View style={{ marginBottom: 15 }}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or admission ID..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={(t) => { setSearchQuery(t); setShowSearchDropdown(t.length > 0); }}
                onFocus={() => setShowSearchDropdown(searchQuery.length > 0)}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearchDropdown(false); }}>
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {showSearchDropdown && (
              <View style={styles.searchDropdown}>
                {filteredLedgers
                  .filter(s =>
                    (s.users?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (s.admission_number || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 8)
                  .map(student => (
                    <TouchableOpacity
                      key={student.id}
                      style={[styles.searchResultItem, student.id === selectedStudentId && { backgroundColor: '#3B82F6' }]}
                      onPress={() => { setSelectedStudentId(student.id); setSearchQuery(''); setShowSearchDropdown(false); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontWeight: '900', color: '#FFF', fontSize: 14 }]}>
                          {student.users?.full_name || 'Unknown'}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#CBD5E0', marginTop: 2 }}>
                          ID: {student.admission_number} • {student.current_class}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, {
                        backgroundColor: student.status === 'PAID' ? '#C6F6D5' : student.status === 'PARTIAL' ? '#FEEBC8' : '#FED7D7'
                      }]}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: student.status === 'PAID' ? '#22543D' : student.status === 'PARTIAL' ? '#744210' : '#C53030' }}>
                          {student.status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                }
                {filteredLedgers.filter(s =>
                  (s.users?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (s.admission_number || '').toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <Text style={{ color: '#64748B', textAlign: 'center', padding: 15, fontStyle: 'italic' }}>
                    No student found for "{searchQuery}"
                  </Text>
                )}
              </View>
            )}

            {selectedStudentId && !showSearchDropdown && (
              <View style={styles.selectedStudentBanner}>
                <Ionicons name="person-circle" size={20} color="#3B82F6" />
                <Text style={styles.selectedStudentText}>
                  {filteredLedgers.find(s => s.id === selectedStudentId)?.users?.full_name} —{' '}
                  {filteredLedgers.find(s => s.id === selectedStudentId)?.admission_number}
                </Text>
                <TouchableOpacity onPress={() => setSelectedStudentId(null)}>
                  <Ionicons name="close-circle" size={18} color="#E53E3E" />
                </TouchableOpacity>
              </View>
            )}
          </View> 

          {selectedStudentData && (
            <View style={styles.accountBox}>
              <Text style={styles.accountName}>{selectedStudentData.users?.full_name} ({selectedStudentData.current_class})</Text>
              <Text style={styles.accountBalance}>Expected: {formatCurrency(selectedStudentData.expected)}  |  Balance: <Text style={{color: '#E53E3E'}}>{formatCurrency(selectedStudentData.balance)}</Text></Text>
              
              {selectedStudentData.expected === 0 && (
                <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0, padding: 8 }]} placeholder="Set Expected Fee..." keyboardType="numeric" value={expectedFeeInput} onChangeText={setExpectedFeeInput} />
                  <TouchableOpacity style={styles.smallButton} onPress={updateExpectedFee}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Assign Fee</Text></TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* PAYMENT LOGGER */}
        <View style={[styles.card, { opacity: selectedStudentId ? 1 : 0.5 }]}>
          <Text style={styles.sectionTitle}>2. Log Payment</Text>
          <TextInput style={styles.input} placeholder="Amount Paid (e.g. 500000)" placeholderTextColor="#64748B" value={amountSLL} onChangeText={setAmountSLL} keyboardType="numeric" editable={!!selectedStudentId} />
          <View style={styles.methodContainer}>
            {paymentOptions.map(method => (
              <TouchableOpacity key={method} style={[styles.methodChip, method === paymentMethod && styles.methodChipActive]} onPress={() => setPaymentMethod(method)} disabled={!selectedStudentId}>
                <Text style={[styles.methodChipText, method === paymentMethod && styles.methodChipTextActive]}>{method}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={recordPayment} disabled={loading || !selectedStudentId}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Process Payment</Text>}
          </TouchableOpacity>
        </View>

        {/* TRANSACTIONS — GROUPED BY STUDENT */}
        <Text style={styles.listTitle}>Transaction History</Text>
        {fetching ? <ActivityIndicator size="large" color="#38A169" /> : transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions found.</Text>
        ) : (
          Object.entries(
            transactions.reduce((groups: any, item) => {
              const key = item.student_id;
              if (!groups[key]) {
                groups[key] = {
                  studentName: item.students?.users?.full_name || 'Unknown',
                  studentClass: item.students?.current_class || '',
                  items: []
                };
              }
              groups[key].items.push(item);
              return groups;
            }, {})
          ).map(([studentId, group]: any) => (
            <View key={studentId} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <Ionicons name="person-circle" size={22} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.groupName}>{group.studentName}</Text>
                <Text style={styles.groupClass}>  {group.studentClass}</Text>
              </View>
              {group.items.map((item: any, idx: number) => (
                <View key={`${item.id}-${idx}`} style={styles.transactionItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transactionDetails}>{item.receipt_number} • {item.payment_method}</Text>
                    <Text style={styles.dateText}>{new Date(item.payment_date).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountText}>{formatCurrency(item.amount_paid_sll)}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity style={styles.printButton} onPress={() => generateReceiptPDF(item)} disabled={printingId === item.id}>
                        {printingId === item.id ? <ActivityIndicator color="#3B82F6" size="small" /> : <Text style={styles.printButtonText}>RECEIPT</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTransaction(item.id)}>
                        <Ionicons name="trash-outline" size={15} color="#E53E3E" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 30, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  subText: { color: '#94A3B8', fontSize: 13, marginBottom: 20 },
  masterPrintBtn: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 8, elevation: 3 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#1E293B', padding: 15, borderRadius: 12, borderWidth: 1 },
  statLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  statValue: { fontSize: 16, fontWeight: '900' },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1E293B' },
  filterBtnActive: { backgroundColor: '#3B82F6' },
  filterText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 12 },
  filterTextActive: { color: '#FFF' },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  input: { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 15, color: '#FFF', borderWidth: 1, borderColor: '#334155' },
  studentChip: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  studentChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  studentChipText: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  studentChipTextActive: { color: '#FFFFFF' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  accountBox: { backgroundColor: '#0F172A', padding: 15, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  accountName: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  accountBalance: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold' },
  smallButton: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 6, marginLeft: 10 },
  methodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  methodChip: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  methodChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' }, 
  methodChipText: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold' },
  methodChipTextActive: { color: '#FFFFFF' },
  primaryButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 10, marginLeft: 4 },
  transactionItem: { backgroundColor: '#1E293B', padding: 16, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  transactionName: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  transactionDetails: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  amountText: { fontSize: 16, fontWeight: '900', color: '#10B981', marginBottom: 8 },
  dateText: { fontSize: 11, color: '#64748B', marginTop: 4 },
  printButton: { backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#3B82F6' },
  printButtonText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 20, fontStyle: 'italic' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  searchDropdown: { backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 8 },
  searchResultItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#0F172A', flexDirection: 'row', alignItems: 'center', backgroundColor: '#263548' },
  selectedStudentBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A5F', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#3B82F6' },
  selectedStudentText: { flex: 1, color: '#93C5FD', fontWeight: '700', fontSize: 13, marginLeft: 8 },
  // 🌟 FEATURE 3 STYLES: BURSAR NOTICEBOARD FEED
  newsItem: { backgroundColor: '#0F172A', padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  newsAuthor: { fontSize: 13, fontWeight: '900', color: '#E2E8F0' },
  newsDate: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },
  newsContent: { fontSize: 13, color: '#94A3B8', marginTop: 4, lineHeight: 18 },
  groupContainer: { backgroundColor: '#1E293B', borderRadius: 12, marginBottom: 16, overflow: 'hidden' as any, borderWidth: 1, borderColor: '#334155' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  groupName: { fontSize: 16, fontWeight: '900' as any, color: '#FFF' },
  groupClass: { fontSize: 13, color: '#94A3B8', fontWeight: 'bold' as any },
  deleteButton: { backgroundColor: '#1a0505', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#E53E3E' }
});