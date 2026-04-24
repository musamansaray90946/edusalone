import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function FeesScreen() {
  const[amountSLL, setAmountSLL] = useState('');
  const [expectedFeeInput, setExpectedFeeInput] = useState('');
  const[paymentMethod, setPaymentMethod] = useState('Cash'); 
  
  const [school, setSchool] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const[selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const[fetching, setFetching] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');

  const paymentOptions =['Cash', 'Orange Money', 'Afrimoney', 'Bank Transfer'];

  useEffect(() => { loadInitialData(); },[]);
  useEffect(() => { if (school) { fetchStudents(); fetchTransactions(); setSelectedStudentId(null); } },[school]);

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
    const { data } = await supabase.from('students').select('id, admission_number, current_class, expected_fee, users!user_id(full_name)').eq('school_id', school.id).order('created_at', { ascending: false });
    if (data) setStudents(data);
  }

  async function fetchTransactions() {
    setFetching(true);
    const { data } = await supabase.from('fee_transactions').select('*, students!student_id(admission_number, current_class, users!user_id(full_name))').eq('school_id', school.id).order('payment_date', { ascending: false });
    if (data) setTransactions(data);
    setFetching(false);
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

  // ==========================================
  // 🖨️ WEB & MOBILE SAFE PDF RECEIPT
  // ==========================================
  async function generateReceiptPDF(transaction: any) {
    setPrintingId(transaction.id);
    try {
      const amountFormatted = "SLL " + transaction.amount_paid_sll.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const dateFormatted = new Date(transaction.payment_date).toLocaleDateString();
      const studentName = transaction.students?.users?.full_name?.toUpperCase() || 'UNKNOWN';
      const studentClass = transaction.students?.current_class || 'N/A';
      const studentAdm = transaction.students?.admission_number || 'N/A';
      
      const logoHtml = school?.logo_url && school.logo_url.startsWith('http') ? `<img src="${school.logo_url}" style="height: 80px; margin-bottom: 10px;" />` : `<div style="height: 80px; width: 80px; border: 2px solid #1A365D; display: inline-block; margin-bottom: 10px; text-align: center; line-height: 80px; font-weight: bold; color:#1A365D;">LOGO</div>`;

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #2D3748; background: #FFF; }
              .receipt-container { border: 2px solid #E2E8F0; border-radius: 12px; padding: 30px; max-width: 600px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #1A365D; padding-bottom: 20px; margin-bottom: 20px; }
              .school-name { font-size: 28px; font-weight: 900; color: #1A365D; text-transform: uppercase; margin: 0; }
              .receipt-title { font-size: 20px; font-weight: bold; color: #38A169; margin-top: 10px; letter-spacing: 2px; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #EDF2F7; padding-bottom: 10px; }
              .label { font-size: 12px; color: #718096; text-transform: uppercase; font-weight: bold; }
              .value { font-size: 16px; font-weight: bold; color: #1A365D; }
              .amount-box { background-color: #F0FFF4; border: 2px solid #38A169; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
              .amount-text { font-size: 32px; font-weight: 900; color: #22543D; margin: 0; }
              .footer { margin-top: 50px; display: flex; justify-content: space-between; }
              .sign-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; font-weight: bold; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <div class="header">
                ${logoHtml}
                <h1 class="school-name">${school?.name || 'School Name'}</h1>
                <div class="receipt-title">OFFICIAL FEE RECEIPT</div>
              </div>
              <div class="info-row"><div><div class="label">Receipt Number</div><div class="value">${transaction.receipt_number}</div></div><div style="text-align:right;"><div class="label">Date</div><div class="value">${dateFormatted}</div></div></div>
              <div class="info-row"><div><div class="label">Student Name</div><div class="value">${studentName}</div></div><div style="text-align:right;"><div class="label">Class / Admission</div><div class="value">${studentClass} | ${studentAdm}</div></div></div>
              <div class="info-row"><div><div class="label">Payment Method</div><div class="value">${transaction.payment_method}</div></div></div>
              <div class="amount-box"><div class="label" style="margin-bottom:5px;">Amount Paid</div><h2 class="amount-text">${amountFormatted}</h2></div>
              <div class="footer"><div class="sign-line">Authorized Signature</div><div class="sign-line">Official Stamp</div></div>
            </div>
          </body>
        </html>
      `;

      // 🚨 THE FIX: Open a new window for Web Printing so it doesn't print the dashboard!
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          setTimeout(() => { printWindow.print(); }, 500); // Wait half a second for styles to load
        } else {
          Alert.alert('Popup Blocked', 'Please allow popups to print receipts.');
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { Alert.alert('System Error', 'Failed to generate Receipt: ' + error.message); }
    setPrintingId(null);
  }

  function formatCurrency(amount: number) { return "SLL " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  // --- LEDGER LOGIC ---
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Fee Management</Text>
        <Text style={styles.subText}>School fees in Sierra Leonean Leones (SLL)</Text>

        {/* FINANCIAL OVERVIEW */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderColor: '#3182CE' }]}><Text style={[styles.statLabel, {color: '#3182CE'}]}>Total Fees</Text><Text style={[styles.statValue, {color: '#3182CE'}]}>{formatCurrency(globalExpected)}</Text></View>
          <View style={[styles.statBox, { borderColor: '#38A169' }]}><Text style={[styles.statLabel, {color: '#38A169'}]}>Total Collected</Text><Text style={[styles.statValue, {color: '#38A169'}]}>{formatCurrency(globalCollected)}</Text></View>
          <View style={[styles.statBox, { borderColor: '#E53E3E' }]}><Text style={[styles.statLabel, {color: '#E53E3E'}]}>Outstanding</Text><Text style={[styles.statValue, {color: '#E53E3E'}]}>{formatCurrency(globalOutstanding)}</Text></View>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }} keyboardShouldPersistTaps="handled">
            {filteredLedgers.map(student => (
              <TouchableOpacity key={student.id} style={[styles.studentChip, student.id === selectedStudentId && styles.studentChipActive]} onPress={() => setSelectedStudentId(student.id)}>
                <Text style={[styles.studentChipText, student.id === selectedStudentId && styles.studentChipTextActive]}>{student.users?.full_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: student.status === 'PAID' ? '#C6F6D5' : student.status === 'PARTIAL' ? '#FEEBC8' : '#FED7D7' }]}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: student.status === 'PAID' ? '#22543D' : student.status === 'PARTIAL' ? '#DD6B20' : '#C53030' }}>{student.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

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

        {/* TRANSACTIONS */}
        <Text style={styles.listTitle}>Transaction History</Text>
        {fetching ? <ActivityIndicator size="large" color="#38A169" /> : transactions.length === 0 ? (
          <Text style={styles.emptyText}>No fees found.</Text>
        ) : (
          transactions.map(item => (
            <View key={item.id} style={styles.transactionItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.transactionName}>{item.students?.users?.full_name}</Text>
                <Text style={styles.transactionDetails}>{item.receipt_number} • {item.payment_method}</Text>
                <Text style={styles.dateText}>{new Date(item.payment_date).toLocaleDateString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Text style={styles.amountText}>{formatCurrency(item.amount_paid_sll)}</Text>
                <TouchableOpacity style={styles.printButton} onPress={() => generateReceiptPDF(item)} disabled={printingId === item.id}>
                  {printingId === item.id ? <ActivityIndicator color="#3B82F6" size="small" /> : <Text style={styles.printButtonText}>Print Receipt</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 30, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 5 },
  subText: { color: '#94A3B8', fontSize: 13, marginBottom: 20 },
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
  label: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase' },
  warningText: { color: '#EF4444', fontStyle: 'italic', marginBottom: 15, fontSize: 13 },
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
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 20, fontStyle: 'italic' }
});