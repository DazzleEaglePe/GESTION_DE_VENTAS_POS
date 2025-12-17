import styled, { keyframes } from "styled-components";
import { useMonedasStore } from "../../../store/MonedasStore";
import { getAllInfoByISO } from "iso-country-currency";
import iso from "iso-country-currency";
import { FlagIcon } from "react-flag-kit";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { useState } from "react";

export const MonedaConfig = () => {
  const { dataempresa, editarMonedaEmpresa } = useEmpresaStore();
  const { search, setSearch, selectedCountry, setSelectedCountry } =
    useMonedasStore();
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const isocodigos = iso.getAllISOCodes();
  
  const handleSearchChange = (e) => {
    setSearch(e.target.value.toLowerCase());
    setShowDropdown(true);
  };

  const handleSelectCountry = (country) => {
    const countryInfo = getAllInfoByISO(country.iso);
    setSelectedCountry({ ...country, currency: countryInfo.currency });
    setSearch(country.countryName);
    setShowDropdown(false);
    mutate.mutateAsync();
  };

  const filteredCountries = isocodigos.filter((country) =>
    country.countryName.toLowerCase().includes(search)
  );

  const editar = async () => {
    const p = {
      id: dataempresa?.id,
      simbolo_moneda: selectedCountry.symbol,
      iso: selectedCountry.iso,
      pais: selectedCountry.countryName,
      currency: selectedCountry.currency
    };
    await editarMonedaEmpresa(p);
  };

  const mutate = useMutation({
    mutationKey: "editar empresa moneda",
    mutationFn: editar,
    onSuccess: () => {
      queryClient.invalidateQueries('mostrar empresa');
      toast.success("Moneda actualizada correctamente");
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
    }
  });

  const currentCountry = selectedCountry || {
    iso: dataempresa?.iso,
    countryName: dataempresa?.pais,
    symbol: dataempresa?.simbolo_moneda,
    currency: dataempresa?.currency
  };

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:coins" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Configuración de Moneda</Title>
            <Subtitle>Define la moneda principal de tu negocio</Subtitle>
          </HeaderInfo>
        </HeaderLeft>
      </Header>

      {/* Main Layout - 2 columns */}
      <MainLayout>
        {/* Left: Search Section */}
        <FormSection>
          <ContentCard>
            {mutate.isPending && <ProgressBar />}
            
            <ContentBody>
              <SectionTitle>
                <Icon icon="lucide:search" />
                Buscar moneda
              </SectionTitle>
              <SectionDescription>
                Busca y selecciona el país para cambiar la moneda de tu sistema
              </SectionDescription>

              <SearchWrapper>
                <SearchIcon>
                  <Icon icon="lucide:globe" />
                </SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="Buscar país..."
                  value={search}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                />
                {search && (
                  <ClearSearchBtn onClick={() => { setSearch(""); setShowDropdown(false); }}>
                    <Icon icon="lucide:x" />
                  </ClearSearchBtn>
                )}
              </SearchWrapper>

              {showDropdown && search && filteredCountries.length > 0 && (
                <DropdownList>
                  {filteredCountries.slice(0, 6).map((country, index) => {
                    const countryInfo = getAllInfoByISO(country.iso);
                    return (
                      <DropdownItem
                        key={index}
                        onClick={() => handleSelectCountry(country)}
                      >
                        <FlagIcon code={country.iso} size={32} />
                        <DropdownItemInfo>
                          <span className="name">{country.countryName}</span>
                          <span className="currency">{countryInfo?.symbol} - {countryInfo?.currency}</span>
                        </DropdownItemInfo>
                        <SelectIcon>
                          <Icon icon="lucide:chevron-right" />
                        </SelectIcon>
                      </DropdownItem>
                    );
                  })}
                </DropdownList>
              )}

              {showDropdown && search && filteredCountries.length === 0 && (
                <EmptyState>
                  <Icon icon="lucide:search-x" />
                  <span>No se encontraron países</span>
                </EmptyState>
              )}

              <Divider />

              <InfoBadge>
                <Icon icon="lucide:info" />
                La moneda se utilizará para mostrar precios y generar reportes
              </InfoBadge>
            </ContentBody>
          </ContentCard>
        </FormSection>

        {/* Right: Preview Section */}
        <PreviewSection>
          <PreviewCard>
            <PreviewHeader>
              <Icon icon="lucide:wallet" />
              Moneda actual
            </PreviewHeader>

            <PreviewBody>
              {/* Currency Card */}
              <CurrencyCardPreview>
                <FlagWrapper>
                  <FlagIcon
                    code={currentCountry.iso || "US"}
                    size={72}
                  />
                </FlagWrapper>
                <CurrencyInfo>
                  <CountryName>{currentCountry.countryName || "No configurado"}</CountryName>
                  <CurrencyDetails>
                    <CurrencySymbol>
                      {currentCountry.symbol || "-"}
                    </CurrencySymbol>
                    <CurrencyCode>
                      {currentCountry.currency || "---"}
                    </CurrencyCode>
                  </CurrencyDetails>
                </CurrencyInfo>
                {mutate.isSuccess && (
                  <SuccessBadge>
                    <Icon icon="lucide:check" />
                  </SuccessBadge>
                )}
              </CurrencyCardPreview>

              {/* Example Prices */}
              <ExampleSection>
                <ExampleTitle>Vista previa de precios</ExampleTitle>
                <ExampleGrid>
                  <ExampleItem>
                    <ExampleLabel>Producto</ExampleLabel>
                    <ExampleValue>{currentCountry.symbol || "$"} 150.00</ExampleValue>
                  </ExampleItem>
                  <ExampleItem>
                    <ExampleLabel>Servicio</ExampleLabel>
                    <ExampleValue>{currentCountry.symbol || "$"} 85.50</ExampleValue>
                  </ExampleItem>
                  <ExampleItem>
                    <ExampleLabel>Total venta</ExampleLabel>
                    <ExampleValue $highlight>{currentCountry.symbol || "$"} 1,250.00</ExampleValue>
                  </ExampleItem>
                </ExampleGrid>
              </ExampleSection>

              {/* Currency Info */}
              <CurrencyInfoCard>
                <InfoRow>
                  <InfoLabel>
                    <Icon icon="lucide:flag" />
                    País
                  </InfoLabel>
                  <InfoValue>{currentCountry.countryName || "-"}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>
                    <Icon icon="lucide:hash" />
                    Código ISO
                  </InfoLabel>
                  <InfoValue>{currentCountry.iso || "-"}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>
                    <Icon icon="lucide:banknote" />
                    Símbolo
                  </InfoLabel>
                  <InfoValue $amber>{currentCountry.symbol || "-"}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>
                    <Icon icon="lucide:coins" />
                    Moneda
                  </InfoLabel>
                  <InfoValue>{currentCountry.currency || "-"}</InfoValue>
                </InfoRow>
              </CurrencyInfoCard>
            </PreviewBody>
          </PreviewCard>
        </PreviewSection>
      </MainLayout>
    </Container>
  );
};

// Animations
const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
`;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #f59e0b;
  }
`;

const HeaderInfo = styled.div``;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 4px 0 0 0;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 800px) {
    grid-template-columns: 1fr 340px;
  }
`;

const FormSection = styled.div``;

const ContentCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 3px;
  background: #e5e7eb;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 25%;
    height: 100%;
    background: #f59e0b;
    animation: ${progressAnimation} 1s ease-in-out infinite;
  }
`;

const ContentBody = styled.div`
  padding: 24px;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 8px 0;

  svg {
    font-size: 18px;
    color: #f59e0b;
  }
`;

const SectionDescription = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0 0 20px 0;
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #94a3b8;
  display: flex;
  align-items: center;

  svg {
    font-size: 18px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: #f8fafc;
  color: #1a1a2e;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
    border-color: #f59e0b;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
`;

const ClearSearchBtn = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #64748b;
    background: #f1f5f9;
  }

  svg {
    font-size: 16px;
  }
`;

const DropdownList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DropdownItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fef3c7;
    border-color: #fde68a;
    transform: translateX(4px);
  }
`;

const DropdownItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;

  .name {
    font-size: 14px;
    font-weight: 500;
    color: #1a1a2e;
  }

  .currency {
    font-size: 12px;
    color: #64748b;
  }
`;

const SelectIcon = styled.div`
  color: #94a3b8;
  
  svg {
    font-size: 18px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: #94a3b8;
  
  svg {
    font-size: 32px;
  }
  
  span {
    font-size: 14px;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: #e2e8f0;
  margin: 24px 0;
`;

const InfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #92400e;

  svg {
    font-size: 16px;
    color: #f59e0b;
    flex-shrink: 0;
  }
`;

// Preview Section
const PreviewSection = styled.div`
  @media (max-width: 799px) {
    order: -1;
  }
`;

const PreviewCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  position: sticky;
  top: 20px;
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  font-size: 14px;
  font-weight: 600;
  color: #92400e;

  svg {
    font-size: 18px;
    color: #f59e0b;
  }
`;

const PreviewBody = styled.div`
  padding: 20px;
`;

const CurrencyCardPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 14px;
  position: relative;
`;

const FlagWrapper = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  background: #fff;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CurrencyInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CountryName = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const CurrencyDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CurrencySymbol = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const CurrencyCode = styled.span`
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
`;

const SuccessBadge = styled.span`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #10b981;
  color: #fff;
  border-radius: 50%;

  svg {
    font-size: 16px;
  }
`;

const ExampleSection = styled.div`
  margin-top: 20px;
`;

const ExampleTitle = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 12px;
`;

const ExampleGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ExampleItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 8px;
`;

const ExampleLabel = styled.span`
  font-size: 13px;
  color: #64748b;
`;

const ExampleValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$highlight ? '#f59e0b' : '#1a1a2e'};
`;

const CurrencyInfoCard = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 12px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  
  &:not(:last-child) {
    border-bottom: 1px dashed #fde68a;
  }
`;

const InfoLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  
  svg {
    font-size: 14px;
    color: #f59e0b;
  }
`;

const InfoValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$amber ? '#f59e0b' : '#1a1a2e'};
`;
