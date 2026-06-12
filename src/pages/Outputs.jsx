// src/pages/Outputs.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { productsService } from '../services/products.service';
import { employeesService } from '../services/employees.service';
import { stockService } from '../services/stock.service';
import Autocomplete from '../components/ui/Autocomplete';
import QuantityStepper from '../components/ui/QuantityStepper';
import Spinner from '../components/ui/Spinner';

export default function Outputs() {
  const { profile, activeCenter } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchProd, setSearchProd] = useState('');
  const [searchEmp, setSearchEmp] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [prods, emps] = await Promise.all([
          productsService.list(profile.company_id, activeCenter?.id),
          employeesService.list(profile.company_id),
        ]);
        setProducts(prods);
        setEmployees(emps);
      } catch (error) {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    if (profile && activeCenter) load();
  }, [profile, activeCenter]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProd.toLowerCase()) || 
    (p.ca && p.ca.toLowerCase().includes(searchProd.toLowerCase()))
  );

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchEmp.toLowerCase()) ||
    (e.registration && e.registration.toLowerCase().includes(searchEmp.toLowerCase()))
  );

  const handleProductSelect = (p) => {
    if (p.current_stock <= 0) {
      toast.error('Produto sem estoque!');
      return;
    }
    setSelectedProduct(p);
    setStep(2);
  };

  const handleConfirm = async () => {
    let finalEmployee = selectedEmployee;

    if (!finalEmployee && searchEmp.trim()) {
      setSubmitting(true);
      try {
        finalEmployee = await employeesService.create({
          name: searchEmp.trim(),
          company_id: profile.company_id,
          active: true
        }, profile.id);
      } catch (err) {
        toast.error('Erro ao criar novo funcionário');
        setSubmitting(false);
        return;
      }
    }

    if (!finalEmployee) {
      toast.error('Selecione ou digite o nome do funcionário');
      return;
    }

    if (quantity > selectedProduct.current_stock) {
      toast.error('Quantidade maior que o estoque disponível!');
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    try {
      await stockService.registerOutput({
        companyId: profile.company_id,
        centerId: activeCenter?.id,
        productId: selectedProduct.id,
        employeeId: finalEmployee.id,
        userId: profile.id,
        quantity,
        notes
      });
      toast.success('Saída registrada com sucesso!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Erro ao registrar saída');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><Spinner /></div>;

  return (
    <>
      {step === 2 && (
        <button className="back-btn" onClick={() => setStep(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
      )}

      <h1 className="page-title">Registrar Saída</h1>
      
      {step === 1 && (
        <>
          <p className="section-subtitle">Selecione o item que será retirado do estoque.</p>
          <div className="search-bar">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Buscar EPI por nome ou CA..." 
              value={searchProd}
              onChange={e => setSearchProd(e.target.value)}
            />
          </div>
          <div className="product-list">
            {filteredProducts.map(p => (
              <div key={p.id} className="product-item" onClick={() => handleProductSelect(p)}>
                <div className="product-item-info">
                  <div className="product-item-name">{p.name}</div>
                  <div className="product-item-meta">CA: {p.ca || 'N/A'} • {p.categories?.name}</div>
                </div>
                <div className="product-item-stock">
                  <div className={`product-item-qty ${p.current_stock === 0 ? 'zero' : ''}`}>{p.current_stock}</div>
                  <div className="product-item-label">disponíveis</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 2 && selectedProduct && (
        <>
          <div className="confirm-product-box">
            <div className="name">{selectedProduct.name}</div>
            <div className="meta">CA: {selectedProduct.ca} • Disp: {selectedProduct.current_stock}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Quantidade</label>
            <QuantityStepper 
              value={quantity} 
              onChange={setQuantity} 
              max={selectedProduct.current_stock} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Funcionário que irá retirar</label>
            <Autocomplete
              value={searchEmp}
              onChange={setSearchEmp}
              options={filteredEmployees}
              onSelect={(emp) => {
                setSelectedEmployee(emp);
                setSearchEmp(`${emp.name} ${emp.registration ? `(${emp.registration})` : ''}`);
              }}
              placeholder="Buscar por nome ou matrícula..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Observações (opcional)</label>
            <input 
              type="text" 
              className="form-input" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Motivo da retirada especial..."
            />
          </div>

          <div className="registered-by">
            Será registrado por: <strong>{profile?.name}</strong>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ marginTop: '24px' }} 
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? <Spinner size={24} /> : 'Confirmar Saída'}
          </button>
        </>
      )}
    </>
  );
}
