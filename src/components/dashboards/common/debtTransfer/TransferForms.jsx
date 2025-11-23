// src/components/dashboards/common/debtTransfer/components/management/TransferForms.jsx
import React from 'react';
import { Card, Row, Col, Alert, Empty } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const TransferForms = () => {
  return (
    <Card>
      <Alert
        message="Transfer Forms"
        description="Use the action buttons above to access different transfer forms. Each form will open in a modal for processing debt settlements and transfers."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card 
            title="Quick Actions" 
            size="small"
            style={{ height: '200px' }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  Select a debtor and choose a transfer type from the action buttons
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="Available Transfer Types" 
            size="small"
            style={{ height: '200px' }}
          >
            <div style={{ lineHeight: '2' }}>
              <div>💵 <strong>Cash Settlement</strong> - Debtor pays cash at station</div>
              <div>📱 <strong>Electronic Transfer</strong> - Debtor to debtor transfer</div>
              <div>🏦 <strong>Bank Settlement</strong> - Bank deposit payment</div>
              <div>🔄 <strong>Cross-Station</strong> - Pay at one station, settle multiple</div>
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default TransferForms;