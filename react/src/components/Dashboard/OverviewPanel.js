import {
  Box,
  ColumnLayout,
  Container,
  Header,
  Link,
} from "@awsui/components-react";
import React from "react";
import EmptyState from "../Navigation/EmptyState";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export default function OverviewPanel({ plans, keys }) {
  const unmarshalledPlans = plans.map(plan => unmarshall(plan));
  const unmarshalledKeys = keys.map(key => unmarshall(key));

  return (
    <Container
      header={
        <Header description="API Keys by Usage Plan" variant="h2">
          Service Overview
        </Header>
      }
    >
      <ColumnLayout columns={unmarshalledPlans.length}>
        {unmarshalledPlans.length > 0 ? (
          unmarshalledPlans.map((plan) => {
            return (
              <div key={plan.id}>
                <Box>{plan.name}</Box>
                <Link fontSize="display-l" href="#">
                  {unmarshalledKeys.filter((key) => key.planId === plan.id).length}
                </Link>
              </div>
            );
          })
        ) : (
          <EmptyState title="No Data" subtitle="No Usage Plans to display." />
        )}
      </ColumnLayout>
    </Container>
  );
}