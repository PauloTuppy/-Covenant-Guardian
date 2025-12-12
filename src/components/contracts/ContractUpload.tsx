/**
 * ContractUpload Component
 * Modal for creating new contracts with document upload and covenant extraction
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { contractService } from '../../services/contracts';
import { useAuthStore } from '../../store/authStore';
import type { ContractCreateInput, Borrower } from '../../types';

interface ContractUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (contractId: string) => void;
    borrowers?: Borrower[];
}

interface FormErrors {
    borrower_id?: string;
    contract_name?: string;
    principal_amount?: string;
    currency?: string;
    origination_date?: string;
    maturity_date?: string;
    interest_rate?: string;
    document?: string;
}

type UploadStep = 'form' | 'uploading' | 'extracting' | 'complete' | 'error';

const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
];

const ContractUpload: React.FC<ContractUploadProps> = ({
    isOpen,
    onClose,
    onSuccess,
    borrowers = [],
}) => {
    const { user } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Form state
    const [formData, setFormData] = useState<Partial<ContractCreateInput>>({
        currency: 'USD',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentText, setDocumentText] = useState('');
    const [step, setStep] = useState<UploadStep>('form');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [createdContractId, setCreatedContractId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Reset form when modal closes
    const handleClose = useCallback(() => {
        setFormData({ currency: 'USD' });
        setErrors({});
        setSelectedFile(null);
        setDocumentText('');
        setStep('form');
        setUploadProgress(0);
        setCreatedContractId(null);
        setErrorMessage(null);
        onClose();
    }, [onClose]);

    // Handle input changes
    const handleInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value,
        }));
        // Clear error when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    }, [errors]);

    // Handle file selection
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setErrors(prev => ({ ...prev, document: 'Please upload a PDF, DOC, DOCX, or TXT file' }));
                return;
            }
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, document: 'File size must be less than 10MB' }));
                return;
            }
            setSelectedFile(file);
            setErrors(prev => ({ ...prev, document: undefined }));
        }
    }, []);

    // Handle file drop
    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const input = fileInputRef.current;
            if (input) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
                handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
            }
        }
    }, [handleFileSelect]);

    // Validate form
    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.borrower_id) {
            newErrors.borrower_id = 'Please select a borrower';
        }
        if (!formData.contract_name?.trim()) {
            newErrors.contract_name = 'Contract name is required';
        }
        if (!formData.principal_amount || formData.principal_amount <= 0) {
            newErrors.principal_amount = 'Principal amount must be greater than 0';
        }
        if (!formData.currency) {
            newErrors.currency = 'Currency is required';
        }
        if (!formData.origination_date) {
            newErrors.origination_date = 'Origination date is required';
        }
        if (!formData.maturity_date) {
            newErrors.maturity_date = 'Maturity date is required';
        }
        if (formData.origination_date && formData.maturity_date) {
            if (new Date(formData.maturity_date) <= new Date(formData.origination_date)) {
                newErrors.maturity_date = 'Maturity date must be after origination date';
            }
        }
        if (formData.interest_rate !== undefined && (formData.interest_rate < 0 || formData.interest_rate > 100)) {
            newErrors.interest_rate = 'Interest rate must be between 0 and 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        try {
            setStep('uploading');
            setUploadProgress(20);

            const contractData: ContractCreateInput = {
                borrower_id: formData.borrower_id!,
                contract_name: formData.contract_name!,
                contract_number: formData.contract_number,
                principal_amount: formData.principal_amount!,
                currency: formData.currency!,
                origination_date: formData.origination_date!,
                maturity_date: formData.maturity_date!,
                interest_rate: formData.interest_rate,
                raw_document_text: documentText || undefined,
                document_file: selectedFile || undefined,
            };

            setUploadProgress(50);

            const contract = await contractService.createContract(contractData);
            
            setUploadProgress(80);
            setCreatedContractId(contract.id);

            // If document was provided, show extraction step
            if (documentText || selectedFile) {
                setStep('extracting');
                // The extraction is queued automatically by the service
                // We'll show a brief extraction message then complete
                setTimeout(() => {
                    setUploadProgress(100);
                    setStep('complete');
                }, 1500);
            } else {
                setUploadProgress(100);
                setStep('complete');
            }

        } catch (error) {
            console.error('Contract creation failed:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create contract');
            setStep('error');
        }
    }, [formData, documentText, selectedFile, validateForm]);

    // Handle completion
    const handleComplete = useCallback(() => {
        if (createdContractId) {
            onSuccess(createdContractId);
        }
        handleClose();
    }, [createdContractId, onSuccess, handleClose]);

    // Render form step
    const renderFormStep = () => (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Borrower Selection */}
            <Select
                label="Borrower *"
                name="borrower_id"
                value={formData.borrower_id || ''}
                onChange={handleInputChange}
                options={borrowers.map(b => ({ value: b.id, label: b.legal_name }))}
                placeholder="Select a borrower"
                error={errors.borrower_id}
                fullWidth
            />

            {/* Contract Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Contract Name *"
                    name="contract_name"
                    value={formData.contract_name || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Term Loan Agreement 2025"
                    error={errors.contract_name}
                    fullWidth
                />
                <Input
                    label="Contract Number"
                    name="contract_number"
                    value={formData.contract_number || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., TL-2025-001"
                    fullWidth
                />
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                    label="Principal Amount *"
                    name="principal_amount"
                    type="number"
                    value={formData.principal_amount || ''}
                    onChange={handleInputChange}
                    placeholder="1000000"
                    error={errors.principal_amount}
                    fullWidth
                />
                <Select
                    label="Currency *"
                    name="currency"
                    value={formData.currency || 'USD'}
                    onChange={handleInputChange}
                    options={CURRENCY_OPTIONS}
                    error={errors.currency}
                    fullWidth
                />
                <Input
                    label="Interest Rate (%)"
                    name="interest_rate"
                    type="number"
                    step="0.01"
                    value={formData.interest_rate ?? ''}
                    onChange={handleInputChange}
                    placeholder="5.5"
                    error={errors.interest_rate}
                    fullWidth
                />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Origination Date *"
                    name="origination_date"
                    type="date"
                    value={formData.origination_date || ''}
                    onChange={handleInputChange}
                    error={errors.origination_date}
                    fullWidth
                />
                <Input
                    label="Maturity Date *"
                    name="maturity_date"
                    type="date"
                    value={formData.maturity_date || ''}
                    onChange={handleInputChange}
                    error={errors.maturity_date}
                    fullWidth
                />
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Contract Document (Optional)
                </label>
                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-primary'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                            <FileText className="h-8 w-8 text-green-600" />
                            <div className="text-left">
                                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                <p className="text-sm text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedFile(null)}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                    ) : (
                        <div>
                            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">
                                Drag and drop your contract document, or{' '}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-primary hover:underline"
                                >
                                    browse
                                </button>
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                PDF, DOC, DOCX, or TXT up to 10MB
                            </p>
                        </div>
                    )}
                </div>
                {errors.document && (
                    <p className="text-sm text-red-600">{errors.document}</p>
                )}
            </div>

            {/* Or paste document text */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Or Paste Contract Text
                </label>
                <textarea
                    name="documentText"
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    placeholder="Paste the contract text here for AI covenant extraction..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500">
                    AI will automatically extract covenants from the document
                </p>
            </div>
        </form>
    );

    // Render uploading/extracting step
    const renderProgressStep = () => (
        <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {step === 'uploading' ? 'Creating Contract...' : 'Extracting Covenants...'}
            </h3>
            <p className="text-gray-500 mb-6">
                {step === 'uploading' 
                    ? 'Saving contract details and uploading document'
                    : 'AI is analyzing the document to extract covenants'}
            </p>
            <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
                <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                />
            </div>
            <p className="text-sm text-gray-400 mt-2">{uploadProgress}%</p>
        </div>
    );

    // Render complete step
    const renderCompleteStep = () => (
        <div className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contract Created Successfully!
            </h3>
            <p className="text-gray-500 mb-6">
                {documentText || selectedFile 
                    ? 'Covenant extraction has been queued. You can monitor the progress on the contract detail page.'
                    : 'You can now add covenants manually or upload a document later.'}
            </p>
            <Button variant="primary" onClick={handleComplete}>
                View Contract
            </Button>
        </div>
    );

    // Render error step
    const renderErrorStep = () => (
        <div className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contract Creation Failed
            </h3>
            <p className="text-gray-500 mb-6">{errorMessage}</p>
            <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={() => setStep('form')}>
                    Try Again
                </Button>
            </div>
        </div>
    );

    // Render footer based on step
    const renderFooter = () => {
        if (step !== 'form') return null;
        
        return (
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Create Contract
                </Button>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={step === 'form' || step === 'error' ? handleClose : undefined}
            title={step === 'form' ? 'Create New Contract' : undefined}
            size="lg"
            showCloseButton={step === 'form' || step === 'error'}
            closeOnOverlayClick={step === 'form'}
            footer={renderFooter()}
        >
            {step === 'form' && renderFormStep()}
            {(step === 'uploading' || step === 'extracting') && renderProgressStep()}
            {step === 'complete' && renderCompleteStep()}
            {step === 'error' && renderErrorStep()}
        </Modal>
    );
};

export default ContractUpload;
