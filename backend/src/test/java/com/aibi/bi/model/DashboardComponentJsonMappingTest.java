package com.aibi.bi.model;

import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.model.request.CreateDashboardComponentRequest;
import com.aibi.bi.model.request.UpdateDashboardComponentRequest;
import com.aibi.bi.model.response.DashboardComponentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DashboardComponentJsonMappingTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializeResponseUsesCamelCaseZIndex() throws Exception {
        DashboardComponentResponse response = new DashboardComponentResponse();
        response.setZIndex(7);

        String json = objectMapper.writeValueAsString(response);

        assertTrue(json.contains("\"zIndex\":7"));
        assertFalse(json.contains("\"zindex\":"));
    }

    @Test
    void serializeDomainUsesCamelCaseZIndex() throws Exception {
        BiDashboardComponent component = new BiDashboardComponent();
        component.setZIndex(11);

        String json = objectMapper.writeValueAsString(component);

        assertTrue(json.contains("\"zIndex\":11"));
        assertFalse(json.contains("\"zindex\":"));
    }

    @Test
    void deserializeCreateRequestReadsCamelCaseZIndex() throws Exception {
        CreateDashboardComponentRequest request = objectMapper.readValue("{\"zIndex\":5}", CreateDashboardComponentRequest.class);

        assertEquals(5, request.getZIndex());
    }

    @Test
    void deserializeUpdateRequestAcceptsLegacyLowercaseAlias() throws Exception {
        UpdateDashboardComponentRequest request = objectMapper.readValue("{\"zindex\":9}", UpdateDashboardComponentRequest.class);

        assertEquals(9, request.getZIndex());
    }
}